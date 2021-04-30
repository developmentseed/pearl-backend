"""Custom Mosaic Factory."""

import os
from io import BytesIO
from dataclasses import dataclass, field
from typing import Callable, Dict, Optional, Type, List, Tuple
from urllib.parse import urlencode
from contextlib import ExitStack

import numpy
from morecantile import TileMatrixSet
from cogeo_mosaic.backends import BaseBackend, MosaicBackend
from cogeo_mosaic.models import Info as mosaicInfo
from rio_tiler.constants import MAX_THREADS
from rio_tiler.io import BaseReader

from titiler.core.utils import Timer
from titiler.core.factory import (
    BaseTilerFactory,
    TilerFactory,
    img_endpoint_params,
)
from titiler.core.models.mapbox import TileJSON
from titiler.core.resources.enums import ImageType, OptionalHeader
from titiler.mosaic.resources.enums import PixelSelectionMethod
from titiler.core.dependencies import WebMercatorTMSParams

from ..cache import cached

from fastapi import Depends, Path, Query

from starlette.requests import Request
from starlette.responses import Response, StreamingResponse

from rio_tiler.io import COGReader
from rio_tiler.colormap import parse_color
from rio_cogeo import cog_translate, cog_profiles
import rasterio
from rasterio.merge import merge
from rasterio.io import MemoryFile

from pydantic import BaseModel, Field, validator


# Models from POST/PUT Body
class CogCreationModel(BaseModel):
    """Request body the `COG` endpoint."""

    input: str
    patches: List[str] = Field(default_factory=list)
    colormap: Optional[Dict]

    @validator("colormap")
    def validate_colormap(cls, v):
        if v:
            return {int(key): parse_color(val) for key, val in v.items()}
        return v


@dataclass
class CustomTilerFactory(TilerFactory):
    def register_routes(self):
        """register routes."""
        super().register_routes()
        self.update_cog()

    def update_cog(self):
        """Register /update_cog endpoint."""

        @self.router.post(
            "/cogify",
            responses={
                200: {
                    "content": {
                        "image/tiff; application=geotiff; profile=cloud-optimized": {},
                    },
                    "description": "Return a COG.",
                }
            },
            response_class=StreamingResponse,
        )
        def cogify(body: CogCreationModel):
            """Create a COG."""
            config = self.gdal_config
            config.update(
                dict(
                    GDAL_NUM_THREADS="ALL_CPUS",
                    GDAL_TIFF_INTERNAL_MASK=True,
                    GDAL_TIFF_OVR_BLOCKSIZE=512,
                )
            )
            output_profile = cog_profiles.get("deflate")

            with ExitStack() as stack:
                patches = list(reversed(body.patches)) + [body.input]
                sources = [
                    stack.enter_context(rasterio.open(source)) for source in patches
                ]
                dest, output_transform = merge(sources)

                try:
                    colormap = sources[0].colormap(1)
                except ValueError:
                    colormap = None

                count, height, width = dest.shape
                profile = {
                    "driver": "GTiff",
                    "count": count,
                    "dtype": dest.dtype,
                    "nodata": sources[0].nodata,
                    "height": height,
                    "width": width,
                    "crs": sources[0].crs,
                    "transform": output_transform,
                }
                with MemoryFile() as in_mem:
                    with in_mem.open(**profile) as in_mem_dst:
                        in_mem_dst.write(dest)
                        del dest
                        with MemoryFile() as out_mem:
                            cog_translate(
                                in_mem_dst,
                                out_mem.name,
                                output_profile,
                                in_memory=True,
                                quiet=True,
                                colormap=body.colormap or colormap,
                                config=config,
                            )
                            return StreamingResponse(
                                BytesIO(out_mem.read()),
                                media_type="image/tiff; application=geotiff; profile=cloud-optimized",
                            )


@dataclass
class MosaicTilerFactory(BaseTilerFactory):
    """Custom MosaicTilerFactory.

    Note this is a really simple MosaicTiler Factory with only few endpoints.
    """

    reader: Type[BaseBackend] = MosaicBackend
    dataset_reader: Type[BaseReader] = COGReader

    # BaseBackend does not support other TMS than WebMercator
    tms_dependency: Callable[..., TileMatrixSet] = WebMercatorTMSParams

    backend_options: Dict = field(default_factory=dict)

    def register_routes(self):
        """Register endpoints."""

        @self.router.get(
            r"/{layer}/info",
            response_model=mosaicInfo,
            responses={200: {"description": "Return info about the MosaicJSON"}},
        )
        def info(src_path=Depends(self.path_dependency)):
            """Return basic info."""
            with self.reader(src_path, **self.backend_options) as src_dst:
                return src_dst.info()

        @self.router.get(r"/{layer}/tiles/{z}/{x}/{y}", **img_endpoint_params)
        @self.router.get(r"/{layer}/tiles/{z}/{x}/{y}.{format}", **img_endpoint_params)
        @self.router.get(r"/{layer}/tiles/{z}/{x}/{y}@{scale}x", **img_endpoint_params)
        @self.router.get(
            r"/{layer}/tiles/{z}/{x}/{y}@{scale}x.{format}", **img_endpoint_params
        )
        @cached()
        def tile(
            z: int = Path(..., ge=0, le=30, description="Mercator tiles's zoom level"),
            x: int = Path(..., description="Mercator tiles's column"),
            y: int = Path(..., description="Mercator tiles's row"),
            scale: int = Query(
                1, gt=0, lt=4, description="Tile size scale. 1=256x256, 2=512x512..."
            ),
            format: ImageType = Query(
                None, description="Output image type. Default is auto."
            ),
            src_path=Depends(self.path_dependency),
            layer_params=Depends(self.layer_dependency),
            dataset_params=Depends(self.dataset_dependency),
            render_params=Depends(self.render_dependency),
            colormap=Depends(self.colormap_dependency),
            pixel_selection: PixelSelectionMethod = Query(
                PixelSelectionMethod.first, description="Pixel selection method."
            ),
            buffer: Optional[int] = Query(
                None, gt=0, description="tile buffer in pixel."
            ),
            kwargs: Dict = Depends(self.additional_dependency),
        ):
            """Create map tile from a COG."""
            timings = []
            headers: Dict[str, str] = {}

            tilesize = scale * 256

            threads = int(os.getenv("MOSAIC_CONCURRENCY", MAX_THREADS))
            with Timer() as t:
                with self.reader(
                    src_path,
                    reader=self.dataset_reader,
                    reader_options=self.reader_options,
                    **self.backend_options,
                ) as src_dst:
                    mosaic_read = t.from_start
                    timings.append(("mosaicread", round(mosaic_read * 1000, 2)))

                    data, _ = src_dst.tile(
                        x,
                        y,
                        z,
                        pixel_selection=pixel_selection.method(),
                        tilesize=tilesize,
                        threads=threads,
                        tile_buffer=buffer,
                        **layer_params.kwargs,
                        **dataset_params.kwargs,
                        **kwargs,
                    )
            timings.append(("dataread", round((t.elapsed - mosaic_read) * 1000, 2)))

            if not format:
                format = ImageType.jpeg if data.mask.all() else ImageType.png

            with Timer() as t:
                image = data.post_process(
                    in_range=render_params.rescale_range,
                    color_formula=render_params.color_formula,
                )
            timings.append(("postprocess", round(t.elapsed * 1000, 2)))

            with Timer() as t:
                content = image.render(
                    add_mask=render_params.return_mask,
                    img_format=format.driver,
                    colormap=colormap,
                    **format.profile,
                    **render_params.kwargs,
                )
            timings.append(("format", round(t.elapsed * 1000, 2)))

            if OptionalHeader.server_timing in self.optional_headers:
                headers["Server-Timing"] = ", ".join(
                    [f"{name};dur={time}" for (name, time) in timings]
                )

            if OptionalHeader.x_assets in self.optional_headers:
                headers["X-Assets"] = ",".join(data.assets)

            return Response(content, media_type=format.mediatype, headers=headers)

        @self.router.get(
            "/{layer}/tilejson.json",
            response_model=TileJSON,
            responses={200: {"description": "Return a tilejson"}},
            response_model_exclude_none=True,
        )
        def tilejson(
            request: Request,
            layer: str = Query(
                ..., description="Mosaic Layer name ('{username}.{layer}')"
            ),
            tile_format: Optional[ImageType] = Query(
                None, description="Output image type. Default is auto."
            ),
            tile_scale: int = Query(
                1, gt=0, lt=4, description="Tile size scale. 1=256x256, 2=512x512..."
            ),
            minzoom: Optional[int] = Query(
                None, description="Overwrite default minzoom."
            ),
            maxzoom: Optional[int] = Query(
                None, description="Overwrite default maxzoom."
            ),
            layer_params=Depends(self.layer_dependency),  # noqa
            dataset_params=Depends(self.dataset_dependency),  # noqa
            render_params=Depends(self.render_dependency),  # noqa
            colormap=Depends(self.colormap_dependency),  # noqa
            pixel_selection: PixelSelectionMethod = Query(
                PixelSelectionMethod.first, description="Pixel selection method."
            ),  # noqa
            buffer: Optional[int] = Query(
                None, gt=0, description="tile buffer in pixel."
            ),  # noqa
            kwargs: Dict = Depends(self.additional_dependency),  # noqa
        ):
            """Return TileJSON document for a Mosaic."""
            # Validate layer
            src_path = self.path_dependency(layer)

            kwargs = {
                "layer": layer,
                "z": "{z}",
                "x": "{x}",
                "y": "{y}",
                "scale": tile_scale,
            }
            if tile_format:
                kwargs["format"] = tile_format.value
            tiles_url = self.url_for(request, "tile", **kwargs)

            q = dict(request.query_params)
            q.pop("TileMatrixSetId", None)
            q.pop("tile_format", None)
            q.pop("tile_scale", None)
            q.pop("minzoom", None)
            q.pop("maxzoom", None)
            qs = urlencode(list(q.items()))
            tiles_url += f"?{qs}"

            with self.reader(src_path, **self.backend_options) as src_dst:
                center = list(src_dst.center)
                if minzoom:
                    center[-1] = minzoom
                return {
                    "bounds": src_dst.bounds,
                    "center": tuple(center),
                    "minzoom": minzoom if minzoom is not None else src_dst.minzoom,
                    "maxzoom": maxzoom if maxzoom is not None else src_dst.maxzoom,
                    "name": "mosaic",
                    "tiles": [tiles_url],
                }
