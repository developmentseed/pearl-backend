import logging

import traceback
import mercantile
import numpy as np
import supermercado
from affine import Affine
from pyproj import Geod
from rasterio.io import MemoryFile
from rasterio.windows import Window
from shapely.geometry import box, shape

LOGGER = logging.getLogger("server")


class TimeFrame:
    def __init__(self, api, aoi, tf, is_patch=False):
        self.id = tf.get("id")

        self.api = api
        self.zoom = self.api.model["model_zoom"]

        # AOI Properties
        self.aoi_id = aoi.get("id")
        self.poly = shape(aoi["bounds"])
        self.bounds = self.poly.bounds
        self.name = aoi.get("name", "Default Name")

        # TimeFrame Properties
        self.checkpoint_id = tf["checkpoint_id"]
        self.mosaic = tf["mosaic"]
        self.is_patch = is_patch
        self.tiles = []
        self.total = 0
        self.live = False

    def create(api, aoi, tf, is_patch=False):
        tf = TimeFrame(api, aoi, tf, is_patch)
        tf.tiles = TimeFrame.gen_tiles(tf.bounds, tf.zoom)
        tf.total = len(tf.tiles)

        LOGGER.info("ok - " + str(tf.total) + " tiles queued")

        tf.bounds = TimeFrame.gen_bounds(tf.tiles)
        LOGGER.info(
            "ok - [" + ",".join(str(x) for x in tf.bounds) + "] timeframe bounds"
        )

        # TODO Check Max size too
        LOGGER.info(
            "ok - timeframe area " + str(TimeFrame.area(tf.bounds))
        )

        tf.live = TimeFrame.area(tf.bounds) < tf.api.server["limits"]["live_inference"]

        if tf.is_patch is not False:
            tf.id = tf.api.create_patch(is_patch, tf.id)["id"]
        else:
            tf.id = tf.api.create_timeframe(tf)["id"]
            tf.api.instance_patch(timeframe_id=tf.id)

        tf.extrema, tf.raw_fabric, tf.fabric = TimeFrame.gen_fabric(tf.bounds, tf.zoom)

        return tf

    def load(api, timeframeid):
        tfjson = api.timeframe_meta(timeframeid)
        aoi = api.aoi_meta(tfjson["aoi_id"])

        tf = TimeFrame(api, aoi, tfjson)
        tf.id = tfjson.get("id")

        tf.api.instance_patch(timeframe_id=tf.id)

        return tf

    def add_to_fabric(self, fragment):
        data = np.moveaxis(fragment.data, -1, 0)

        col_off = (fragment.x - self.extrema["x"]["min"]) * 256
        row_off = (fragment.y - self.extrema["y"]["min"]) * 256

        self.fabric.write(data, window=Window(col_off, row_off, 256, 256))

    def upload_fabric(self):
        self.fabric.close()

        for i in range(0, 10):
            try:
                if self.is_patch is not False:
                    self.api.upload_patch(self.is_patch, self.id, self.raw_fabric)
                else:
                    self.api.upload_timeframe(self.aoi_id, self.id, self.raw_fabric)
            except Exception as e:
                LOGGER.error("Error: {0}".format(e))
                traceback.print_exc()

                continue
            break

    @staticmethod
    def gen_fabric(bounds, zoom):
        extrema = supermercado.burntiles.tile_extrema(bounds, zoom)
        transform = make_transform(extrema, zoom)

        height = (extrema["y"]["max"] - extrema["y"]["min"]) * 256
        width = (extrema["x"]["max"] - extrema["x"]["min"]) * 256

        memfile = MemoryFile()
        writer = memfile.open(
            driver="GTiff",
            count=1,
            dtype="uint8",
            crs="EPSG:3857",
            transform=transform,
            height=height,
            width=width,
            nodata=255,
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
