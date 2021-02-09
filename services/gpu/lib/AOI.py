import logging
import pyproj
import shapely
import geojson
import json
import shapely.ops as ops
from shapely.geometry.polygon import Polygon
from shapely.geometry import box
from functools import partial
from shapely.ops import transform
from shapely.geometry import shape
from tiletanic import tilecover, tileschemes
import mercantile

tiler = tileschemes.WebMercator()

LOGGER = logging.getLogger("server")


class AOI():
    def __init__(self, api, poly):

        self.api = api
        self.poly = poly

        self.tiles = AOI.gen_tiles(self.poly, self.api.mosaic['maxzoom'])
        self.total = len(self.tiles)

        LOGGER.info("ok - " + str(self.total) + " tiles queued")

        self.bounds = AOI.gen_bounds(self.tiles)
        LOGGER.info("ok - [" + ','.join(str(x) for x in self.bounds) + "] aoi bounds")

        # TODO Calculate Area in Metres & Check Max size too
        self.live = AOI.area(self.bounds) > self.api.server['limits']['live_inference']

        self.api.create_aoi(self.bounds)

        self.memrasters = self.api.get_tiles(self.tiles, iformat='npy')

    @staticmethod
    def gen_tiles(poly, zoom):
        poly = shape(geojson.loads(json.dumps(poly)))

        project = pyproj.Transformer.from_proj(
            pyproj.Proj('epsg:4326'),
            pyproj.Proj('epsg:3857'),
            always_xy=True
        )

        poly = transform(project.transform, poly)

        return list(tilecover.cover_geometry(tiler, poly, zoom))

    @staticmethod
    def area(bounds):
        geom = box(*bounds)

        return ops.transform(
            partial(
                pyproj.transform,
                pyproj.Proj('EPSG:4326'),
                pyproj.Proj(
                    proj='aea',
                    lat_1=geom.bounds[1],
                    lat_2=geom.bounds[3]
                )
            ), geom).area


    @staticmethod
    def gen_bounds(tiles):
        bounds = mercantile.bounds(tiles[0])

        for tile in tiles:
            tilebounds = mercantile.bounds(tile.x, tile.y, tile.z)

            if tilebounds.west < bounds[0]:
                bounds[0] - tilebounds.west
            if tilebounds.south < bounds[1]:
                bounds[1] - tilebounds.south
            if tilebounds.east > bounds[2]:
                bounds[2] - tilebounds.east
            if tilebounds.north < bounds[3]:
                bounds[3] - tilebounds.north

        return list(bounds)
