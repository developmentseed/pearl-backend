"""Custom Mosaic Factory."""

import os
from io import BytesIO
from dataclasses import dataclass, field
from typing import Callable, Dict, Optional, Type
from urllib.parse import urlencode

from morecantile import TileMatrixSet
from cogeo_mosaic.backends import BaseBackend, MosaicBackend
from cogeo_mosaic.models import Info as mosaicInfo
from rio_tiler.constants import MAX_THREADS
from rio_tiler.io import BaseReader

from titiler import utils
from titiler.endpoints.factory import BaseTilerFactory, TilerFactory, img_endpoint_params
from titiler.models.mapbox import TileJSON
from titiler.resources.enums import ImageType, PixelSelectionMethod, OptionalHeader
from titiler.dependencies import WebMercatorTMSParams

from ..cache import cached
from ..custom.reader import CustomCOGReader as COGReader

from fastapi import Depends, Path, Query

from starlette.requests import Request
from starlette.responses import Response, StreamingResponse

from rio_cogeo import cog_translate, cog_profiles
from rasterio.io import MemoryFile


@dataclass
class CustomTilerFactory(TilerFactory):

    def register_routes(self):
        """register routes."""
        super().register_routes()
        self.update_cog()


    def update_cog(self):
        """Register /update_cog endpoint."""

        @self.router.get(
            "/colorize",
            responses={
                200: {
                    "content": {
                        "image/tiff; application=geotiff; profile=cloud-optimized": {},
                    },
                    "description": "Return a COG.",
                }
            },
            response_class=StreamingResponse
        )
        def colorize(
            src_path=Depends(self.path_dependency),
            colormap=Depends(self.colormap_dependency),
        ):
            """Return the bounds of the COG."""
            config = self.gdal_config
            config.update(
                dict(
                    GDAL_NUM_THREADS="ALL_CPUS",
                    GDAL_TIFF_INTERNAL_MASK=True,
                    GDAL_TIFF_OVR_BLOCKSIZE=512,
                )
            )
            output_profile = cog_profiles.get("deflate")
            with MemoryFile() as mem_dst:
                cog_translate(
                    src_path,
                    mem_dst.name,
                    output_profile,
                    in_memory=True,
                    quiet=True,
                    colormap=colormap,
                    config=config,
                )
                return StreamingResponse(BytesIO(mem_dst.read()), media_type="video/mp4")


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
            buffer: Optional[int] = Query(None, gt=0, description="tile buffer in pixel."),
            kwargs: Dict = Depends(self.additional_dependency),
        ):
            """Create map tile from a COG."""
            timings = []
            headers: Dict[str, str] = {}

            tilesize = scale * 256

            threads = int(os.getenv("MOSAIC_CONCURRENCY", MAX_THREADS))
            with utils.Timer() as t:
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
                        buffer=buffer,
                        **layer_params.kwargs,
                        **dataset_params.kwargs,
                        **kwargs,
                    )
            timings.append(("dataread", round((t.elapsed - mosaic_read) * 1000, 2)))

            if not format:
                format = ImageType.jpeg if data.mask.all() else ImageType.png

            with utils.Timer() as t:
                image = data.post_process(
                    in_range=render_params.rescale_range,
                    color_formula=render_params.color_formula,
                )
            timings.append(("postprocess", round(t.elapsed * 1000, 2)))

            with utils.Timer() as t:
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
            layer: str = Query(..., description="Mosaic Layer name ('{username}.{layer}')"),
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
            buffer: Optional[int] = Query(None, gt=0, description="tile buffer in pixel."),  # noqa
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
