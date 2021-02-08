import logging
import pyproj
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
        self.bounds = API.gen_bounds(self.tiles)

        self.api.create_aoi(bounds)

        memrasters = self.api.get_tiles(self.tiles, iformat='npy')


    @static
    def gen_tiles(poly):
        poly = shape(geojson.loads(json.dumps(geom)))

        project = pyproj.Transformer.from_proj(
            pyproj.Proj('epsg:4326'),
            pyproj.Proj('epsg:3857'),
            always_xy=True
        )

        poly = transform(project.transform, poly)

        return tilecover.cover_geometry(tiler, poly, self.mosaic['maxzoom'])

    @static
    def gen_bounds(tiles):
        bounds = []
