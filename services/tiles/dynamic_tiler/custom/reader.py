
import warnings
import attr
from typing import Any, Optional, Sequence, Union

from morecantile import Tile
from rio_tiler.io import COGReader
from rio_tiler.models import ImageData
from rio_tiler.errors import ExpressionMixingWarning, TileOutsideBounds
from rio_tiler.expression import apply_expression, parse_expression

from rio_tiler import reader


@attr.s
class CustomCOGReader(COGReader):

    def tile(
        self,
        tile_x: int,
        tile_y: int,
        tile_z: int,
        tilesize: int = 256,
        indexes: Optional[Union[int, Sequence]] = None,
        expression: Optional[str] = None,
        buffer: int = 0,
        **kwargs: Any,
    ) -> ImageData:
        """Read a Web Map tile from a COG.

        Args:
            tile_x (int): Tile's horizontal index.
            tile_y (int): Tile's vertical index.
            tile_z (int): Tile's zoom level index.
            tilesize (int, optional): Output image size. Defaults to `256`.
            indexes (int or sequence of int, optional): Band indexes.
            expression (str, optional): rio-tiler expression (e.g. b1/b2+b3).
            kwargs (optional): Options to forward to the `rio_tiler.reader.part` function.

        Returns:
            rio_tiler.models.ImageData: ImageData instance with data, mask and tile spatial info.

        """
        kwargs = {**self._kwargs, **kwargs}

        if not self.tile_exists(tile_z, tile_x, tile_y):
            raise TileOutsideBounds(
                f"Tile {tile_z}/{tile_x}/{tile_y} is outside {self.filepath} bounds"
            )

        if isinstance(indexes, int):
            indexes = (indexes,)

        if indexes and expression:
            warnings.warn(
                "Both expression and indexes passed; expression will overwrite indexes parameter.",
                ExpressionMixingWarning,
            )

        if expression:
            indexes = parse_expression(expression)

        tile_bounds = self.tms.xy_bounds(*Tile(x=tile_x, y=tile_y, z=tile_z))
        if buffer:
            # left, bottom, right, top
            x_res = (tile_bounds[2] - tile_bounds[0]) / tilesize
            y_res = (tile_bounds[3] - tile_bounds[1]) / tilesize
            tile_bounds = (
                tile_bounds[0] - x_res * buffer,
                tile_bounds[1] - y_res * buffer,
                tile_bounds[2] + x_res * buffer,
                tile_bounds[3] + y_res * buffer,
            )
            tilesize += buffer * 2

        tile, mask = reader.part(
            self.dataset,
            tile_bounds,
            tilesize,
            tilesize,
            indexes=indexes,
            dst_crs=self.tms.crs,
            **kwargs,
        )
        if expression:
            blocks = expression.lower().split(",")
            bands = [f"b{bidx}" for bidx in indexes]
            tile = apply_expression(blocks, bands, tile)

        return ImageData(
            tile, mask, bounds=tile_bounds, crs=self.tms.crs, assets=[self.filepath]
        )
