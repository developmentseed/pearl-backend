import logging
import shapely
import geojson
import json
import numpy as np
import shapely.ops as ops
import rasterio
import supermercado
from shapely.geometry import shape
from pyproj import Geod
from affine import Affine
from rasterio.windows import Window
from shapely.geometry import box, mapping
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
    def __init__(self, api, poly, name, checkpointid, is_patch=False):
        self.api = api
        self.poly = shape(poly)
        self.bounds = self.poly.bounds
        self.name = name
        self.checkpointid = checkpointid
        self.is_patch = is_patch
        self.zoom = self.api.model['model_zoom']
        self.tiles = []
        self.total = 0
        self.live = False

    def create(api, poly, name, checkpointid, is_patch=False):
        aoi = AOI(api, poly, name, checkpointid, is_patch);
        aoi.tiles = AOI.gen_tiles(aoi.bounds, aoi.zoom)
        aoi.total = len(aoi.tiles)

        LOGGER.info("ok - " + str(aoi.total) + " tiles queued")

        aoi.bounds = AOI.gen_bounds(aoi.tiles)
        LOGGER.info("ok - [" + ','.join(str(x) for x in aoi.bounds) + "] aoi bounds")

        # TODO Check Max size too
        aoi.live = AOI.area(aoi.bounds) < aoi.api.server['limits']['live_inference']

        if aoi.is_patch is not False:
            aoi.id = aoi.api.create_patch(is_patch)["id"]
        else:
            aoi.id = aoi.api.create_aoi(aoi)["id"]
            aoi.api.instance_patch(aoi_id = aoi.id)

        aoi.extrema, aoi.raw_fabric, aoi.fabric = AOI.gen_fabric(aoi.bounds, aoi.zoom)

        return aoi

    def load(api, aoiid):
        aoijson = api.aoi_meta(aoiid);

        aoi = AOI(api, shape(aoijson.get('bounds')), aoijson.get('name'), aoijson.get('checkpoint_id'));
        aoi.id = aoijson.get('id')

        aoi.api.instance_patch(aoi_id = aoi.id)

        return aoi

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
    def gen_tiles(bounds, zoom):
        return list(mercantile.tiles(*bounds, zoom))

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
