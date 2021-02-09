import logging
import pyproj
import shapely
import shapely.ops as ops
from shapely.geometry.polygon import Polygon
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

        self.tiles = AOI.gen_tiles(self.poly)
        self.total = len(tiles)
        self.bounds = API.gen_bounds(self.tiles)

        # TODO Calculate Area in Metres & Check Max size too
        self.live = AOI.area(self.bounds) > self.aoi['limits']['live_inference']

        self.api.create_aoi(bounds)

        self.memrasters = self.api.get_tiles(self.tiles, iformat='npy')

    @staticmethod
    def gen_tiles(poly):
        poly = shape(geojson.loads(json.dumps(geom)))

        project = pyproj.Transformer.from_proj(
            pyproj.Proj('epsg:4326'),
            pyproj.Proj('epsg:3857'),
            always_xy=True
        )

        poly = transform(project.transform, poly)

        return tilecover.cover_geometry(tiler, poly, self.mosaic['maxzoom'])

    @staticmethod
    def area(geom):
        geom = box(geom)

        return ops.transform(
            partial(
                pyproj.transform,
                pyproj.Proj(init='EPSG:4326'),
                pyproj.Proj(
                    proj='aea',
                    lat_1=geom.bounds[1],
                    lat_2=geom.bounds[3]
                )
            ), geom).area


    @staticmethod
    def gen_bounds(tiles):
        bounds = [] # west, south, east, north

        for tile in tiles:
            tilebounds = mercantile.bounds(tile.x, tile.y, tile.z)

            if bounds[0] is None or tilebounds.west < bounds[0]:
                bounds[0] - tilebounds.west
            if bounds[1] is None or tilebounds.south < bounds[1]:
                bounds[1] - tilebounds.south
            if bounds[2] is None or tilebounds.east > bounds[2]:
                bounds[2] - tilebounds.east
            if bounds[3] is None or tilebounds.north < bounds[3]:
                bounds[3] - tilebounds.north

        return bounds
