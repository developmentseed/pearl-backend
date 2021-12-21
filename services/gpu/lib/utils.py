import base64
import json
import io
import logging
import math
import os
import random
import sys
import threading
import rasterio
import rasterio.crs
import rasterio.io
import rasterio.mask
import rasterio.merge
import rasterio.transform

from collections.abc import Iterable
from logging.handlers import TimedRotatingFileHandler

import mercantile
import numpy as np
from PIL import Image
from rasterio.transform import from_bounds
from shapely.geometry import Point, mapping, shape

R2D = 180 / math.pi
RE = 6378137.0
CE = 2 * math.pi * RE
EPSILON = 1e-14
LL_EPSILON = 1e-11


class PX:
    def __init__(self, coords, xy, xyz, px, value):
        self.xyz = xyz  # Tile Coordinates
        self.xy = xy  # Mercator Coordinates
        self.coords = coords  # WGS84 Coordinates
        self.px = px  # Per Tile Pixel Coordinates
        self.value = value  # Pixel Value from retrain numpy array (Model#Run)

    def __str__(self):
        return "PX({}: vals: {})".format(self.coords, len(self.value))

    def __repr__(self):
        return str(self)


def pxs2geojson(classes):
    geoms = []
    for cls in classes:
        geo = {"type": "MultiPoint", "coordinates": []}

        for px in cls:
            geo["coordinates"].append(px.coords)

        geoms.append(geo)

    return geoms


def geom2coords(geom):
    coords = []

    if geom["type"] == "Point":
        coords.append(geom["coordinates"])
    elif geom["type"] == "MultiPoint":
        for coord in geom["coordinates"]:
            coords.append(coord)
    else:
        return False

    return coords


def geom2px(coords, modelsrv, websocket=False, total=0, curr=1, bounds=None):
    zoom = modelsrv.api.model["model_zoom"]

    pxs = []

    for i, coord in enumerate(coords):
        inside = True
        if bounds is not None and (bounds[0] > coord[0] or bounds[1] > coord[1] or bounds[2] < coord[0] or bounds[3] < coord[1]):
            inside = False

        if inside:
            xy = ll2xy(coord[0], coord[1])
            xyz = mercantile.tile(coord[0], coord[1], zoom)

            transform = from_bounds(*mercantile.xy_bounds(xyz), 256, 256)

            pixels = rowcol(transform, *xy)

            in_memraster = modelsrv.api.get_tile(xyz.z, xyz.x, xyz.y, iformat="npy")

            retrain = modelsrv.model.run(in_memraster.data)
            retrain = retrain[32:288, 32:288, :]

            value = retrain[pixels[0], pixels[1]].copy()

            px = PX(coord, xy, xyz, pixels, value)
            pxs.append(px)

        if websocket is not False:
            websocket.send(
                json.dumps(
                    {
                        "message": "model#retrain#progress",
                        "data": {"total": total, "processed": curr + i + 1},
                    }
                )
            )

    return pxs


def pred2png(output, color_list):
    rgb_list = []
    for color in color_list:
        rgb_list.append(hex2rgb(color))
    # add alpah channel with no transperency
    rgba_lst = [x + (255,) for x in rgb_list]
    rgb = Image.new("RGBA", (output.shape[0], output.shape[1]))

    newdata = []
    for x in range(output.shape[0]):
        for y in range(output.shape[1]):
            # full transperancy for maksed out areas
            if output[x][y] == 255:
                newdata.append((255, 255, 255, 0))
            else:
                newdata.append(rgba_lst[output[x][y]])
    rgb.putdata(newdata)

    with io.BytesIO() as output:
        rgb.save(output, format="PNG")
        return base64.b64encode(output.getvalue()).decode("utf-8")


def hex2rgb(hexstr):
    hexstr = hexstr.lstrip("#")
    return tuple(int(hexstr[i : i + 2], 16) for i in (0, 2, 4))


def ll2xy(lng, lat, truncate=False):
    """Convert longitude and latitude to web mercator x, y
    Parameters
    ----------
    lng, lat : float
        Longitude and latitude in decimal degrees.
    truncate : bool, optional
        Whether to truncate or clip inputs to web mercator limits.
    Returns
    -------
    x, y : float
        y will be inf at the North Pole (lat >= 90) and -inf at the
        South Pole (lat <= -90).
    """
    if truncate:
        lng, lat = truncate_lnglat(lng, lat)

    x = RE * math.radians(lng)

    if lat <= -90:
        y = float("-inf")
    elif lat >= 90:
        y = float("inf")
    else:
        y = RE * math.log(math.tan((math.pi * 0.25) + (0.5 * math.radians(lat))))

    return x, y


def rowcol(transform, xs, ys, op=math.floor, precision=None):
    """
    Returns the rows and cols of the pixels containing (x, y) given a
    coordinate reference system.
    Use an epsilon, magnitude determined by the precision parameter
    and sign determined by the op function:
        positive for floor, negative for ceil.
    Parameters
    ----------
    transform : Affine
        Coefficients mapping pixel coordinates to coordinate reference system.
    xs : list or float
        x values in coordinate reference system
    ys : list or float
        y values in coordinate reference system
    op : function
        Function to convert fractional pixels to whole numbers (floor, ceiling,
        round)
    precision : int or float, optional
        An integer number of decimal points of precision when computing
        inverse transform, or an absolute float precision.
    Returns
    -------
    rows : list of ints
        list of row indices
    cols : list of ints
        list of column indices
    """

    if not isinstance(xs, Iterable):
        xs = [xs]
    if not isinstance(ys, Iterable):
        ys = [ys]

    if precision is None:
        eps = sys.float_info.epsilon
    elif isinstance(precision, int):
        eps = 10.0 ** -precision
    else:
        eps = precision

    # If op rounds up, switch the sign of eps.
    if op(0.1) >= 1:
        eps = -eps

    invtransform = ~transform

    rows = []
    cols = []
    for x, y in zip(xs, ys):
        fcol, frow = invtransform * (x + eps, y - eps)
        cols.append(op(fcol))
        rows.append(op(frow))

    if len(xs) == 1:
        cols = cols[0]
    if len(ys) == 1:
        rows = rows[0]

    return rows, cols


def generate_random_points(count, feature):
    polygon = shape(feature)
    points = {"type": "MultiPoint", "coordinates": []}
    minx, miny, maxx, maxy = polygon.bounds
    while len(points["coordinates"]) < count:
        point = Point(random.uniform(minx, maxx), random.uniform(miny, maxy))
        if polygon.contains(point):
            points["coordinates"].append(mapping(point)["coordinates"])

    return points


def setup_logging(log_path, log_name, level=logging.DEBUG):

    if not os.path.exists(log_path):
        os.makedirs(log_path)

    print_formatter = logging.Formatter("[%(asctime)s] - %(message)s")
    file_formatter = logging.Formatter(
        "%(asctime)s - %(name)-8s - %(levelname)-6s - %(message)s"
    )

    logger = logging.getLogger("server")
    logger.setLevel(level)

    file_handler = TimedRotatingFileHandler(
        log_path + "/%s.txt" % (log_name), when="midnight", interval=1
    )
    file_handler.suffix = "%Y%m%d"
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    print_handler = logging.StreamHandler()
    print_handler.setFormatter(print_formatter)
    logger.addHandler(print_handler)

    return logger


def serialize(array):
    with io.BytesIO() as f:
        np.save(f, array)
        return f.getvalue()


def deserialize(data):
    with io.BytesIO(data) as f:
        return np.load(f)


class AtomicCounter:
    """From https://gist.github.com/benhoyt/8c8a8d62debe8e5aa5340373f9c509c7"""

    def __init__(self, initial=0):
        """Initialize a new atomic counter to given initial value (default 0)."""
        self.value = initial
        self._lock = threading.Lock()

    def increment(self, num=1):
        """Atomically increment the counter by num (default 1) and return the
        new value.
        """
        with self._lock:
            self.value += num
            return self.value


def get_random_string(length):
    alphabet = "abcdefghijklmnopqrstuvwxyz"
    return "".join(
        [alphabet[np.random.randint(0, len(alphabet))] for i in range(length)]
    )
