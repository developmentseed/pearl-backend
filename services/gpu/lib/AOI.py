import logging
import shapely
import geojson
import json
import numpy as np
import shapely.ops as ops
import rasterio
import supermercado
from pyproj import Geod
from affine import Affine
from rasterio.windows import Window
from rasterio.io import MemoryFile
from rasterio.warp import transform_geom
from rasterio.crs import CRS
from shapely.geometry.polygon import Polygon
from shapely.geometry import box
from functools import partial
from shapely.ops import transform
from shapely.geometry import shape
import mercantile

LOGGER = logging.getLogger("server")


class AOI():
    def __init__(self, api, body, checkpointid, is_patch=False):
        self.api = api
        self.poly = body['polygon']
        self.name = body.get('name', '')
        self.checkpointid = checkpointid
        self.is_patch = is_patch

        self.zoom = self.api.model['model_zoom']

        self.tiles = AOI.gen_tiles(self.poly, self.zoom)
        self.total = len(self.tiles)

        LOGGER.info("ok - " + str(self.total) + " tiles queued")

        self.bounds = AOI.gen_bounds(self.tiles)
        LOGGER.info("ok - [" + ','.join(str(x) for x in self.bounds) + "] aoi bounds")

        # TODO Check Max size too
        self.live = AOI.area(self.bounds) < self.api.server['limits']['live_inference']

        if self.is_patch is not False:
            self.id = self.api.create_patch(is_patch)["id"]
        else:
            self.id = self.api.create_aoi(self)["id"]
            self.api.instance_patch(aoi_id = self.id)

        self.extrema, self.raw_fabric, self.fabric = AOI.gen_fabric(self.bounds, self.zoom)

    def add_to_fabric(self, fragment):
        data = np.moveaxis(fragment.data, -1, 0)

        col_off = (fragment.x - self.extrema["x"]["min"]) * 256
        row_off = (fragment.y - self.extrema["y"]["min"]) * 256

        self.fabric.write(data, window=Window(col_off, row_off, 256, 256))

    def upload_fabric(self):
        self.fabric.close()

        if self.is_patch is not False:
            self.api.upload_patch(self.is_patch, self.id, self.raw_fabric)
        else:
            self.api.upload_aoi(self.id, self.raw_fabric)

    @staticmethod
    def gen_fabric(bounds, zoom):
        extrema = supermercado.burntiles.tile_extrema(bounds, zoom)
        transform = make_transform(extrema, zoom)

        height = (extrema["y"]["max"] - extrema["y"]["min"]) * 256
        width = (extrema["x"]["max"] - extrema["x"]["min"]) * 256

        memfile = MemoryFile()
        writer = memfile.open(
            driver='GTiff',
            count=1,
            dtype='uint8',
            crs='EPSG:3857',
            transform=transform,
            height=height,
            width=width,
            nodata=255
        )
        return (extrema, memfile, writer)

    @staticmethod
    def gen_tiles(poly, zoom):
        poly = shape(geojson.loads(json.dumps(poly)))
        return list(mercantile.tiles(*poly.bounds, zoom))

    @staticmethod
    def area(bounds):
        geom = box(*bounds)
        geod = Geod(ellps="WGS84")
        return abs(geod.geometry_area_perimeter(geom)[0])


    @staticmethod
    def gen_bounds(tiles):
        bounds = [*mercantile.bounds(tiles[0])]

        for tile in tiles:
            tilebounds = mercantile.bounds(tile.x, tile.y, tile.z)

            if tilebounds.west < bounds[0]:
                bounds[0] = tilebounds.west
            if tilebounds.south < bounds[1]:
                bounds[1] = tilebounds.south
            if tilebounds.east > bounds[2]:
                bounds[2] = tilebounds.east
            if tilebounds.north > bounds[3]:
                bounds[3] = tilebounds.north

        return list(bounds)

def make_transform(tilerange, zoom):
    ulx, uly = mercantile.xy(
        *mercantile.ul(tilerange["x"]["min"], tilerange["y"]["min"], zoom)
    )

    lrx, lry = mercantile.xy(
        *mercantile.ul(tilerange["x"]["max"], tilerange["y"]["max"], zoom)
    )

    xcell = (lrx - ulx) / (float(tilerange["x"]["max"] - tilerange["x"]["min"]) * 256)
    ycell = (uly - lry) / (float(tilerange["y"]["max"] - tilerange["y"]["min"]) * 256)

    return Affine(xcell, 0, ulx, 0, -ycell, uly)
