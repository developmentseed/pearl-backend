from collections.abc import Iterable
import base64
import sys
import io
import math
import mercantile
import numpy as np
from PIL import Image

import os
import threading

import rasterio
import rasterio.warp
import rasterio.crs
import rasterio.io
import rasterio.mask
import rasterio.transform
from rasterio.transform import from_bounds
import rasterio.merge

import numpy as np

import logging
from logging.handlers import TimedRotatingFileHandler

R2D = 180 / math.pi
RE = 6378137.0
CE = 2 * math.pi * RE
EPSILON = 1e-14
LL_EPSILON = 1e-11


class PX:
    def __init__(self, coords, xy, xyz, px, value):
        self.xyz = xyz # Tile Coordinates
        self.xy = xy # Mercator Coordinates
        self.coords = coords #WGS84 Coordinates
        self.px = px # Per Tile Pixel Coordinates
        self.value = value # Pixel Value from retrain numpy array (Model#Run)

def pxs2geojson(classes):
    geoms = []
    for cls in classes:
        geo = {
            'type': 'MultiPoint',
            'coordinates': []
        }

        for px in cls:
            geo['coordinates'].append(px.coords)

        geoms.append(geo)

    return geoms


def geom2px(geom, modelsrv):
    zoom = modelsrv.api.model['model_zoom']

    coords = []

    if geom['type'] == 'Point':
        coords.append(geom['coordinates'])
    elif geom['type'] == 'MultiPoint':
        for coord in geom['coordinates']:
            coords.append(coord)
    else:
        return False

    pxs = []
    for coord in coords:
        xy = ll2xy(coord[0], coord[1])
        xyz = mercantile.tile(coord[0], coord[1], zoom)

        transform = from_bounds(*mercantile.xy_bounds(xyz), 256, 256)

        pixels = rowcol(transform, *xy)

        in_memraster = modelsrv.api.get_tile(xyz.z, xyz.x, xyz.y, iformat='npy')
        _, retrain = modelsrv.model.run(in_memraster.data, False)

        value = retrain[pixels[0], pixels[1]]

        pxs.append(PX(coord, xy, xyz, pixels, value))

    return pxs


def pred2png(output, color_list):
    rgb_list = []
    for color in color_list:
        rgb_list.append(hex2rgb(color))

    rgb = Image.new('RGB', (output.shape[0], output.shape[1]))

    newdata = []
    for x in range(output.shape[0]):
        for y in range(output.shape[1]):
            newdata.append(rgb_list[output[x][y]])
    rgb.putdata(newdata)

    with io.BytesIO() as output:
        rgb.save(output, format="PNG")
        return base64.b64encode(output.getvalue()).decode("utf-8")

def hex2rgb(hexstr):
    hexstr = hexstr.lstrip('#')
    return tuple(int(hexstr[i:i+2], 16) for i in (0, 2, 4))

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


def setup_logging(log_path, log_name, level=logging.DEBUG):

    if not os.path.exists(log_path):
        os.makedirs(log_path)

    print_formatter = logging.Formatter('[%(asctime)s] - %(message)s')
    file_formatter = logging.Formatter('%(asctime)s - %(name)-8s - %(levelname)-6s - %(message)s')

    logger = logging.getLogger("server")
    logger.setLevel(level)

    file_handler = TimedRotatingFileHandler(log_path + "/%s.txt" % (log_name), when='midnight', interval=1)
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
    ''' From https://gist.github.com/benhoyt/8c8a8d62debe8e5aa5340373f9c509c7 '''
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

NLCD_CLASSES = [
    0, 11, 12, 21, 22, 23, 24, 31, 41, 42, 43, 51, 52, 71, 72, 73, 74, 81, 82, 90, 95, 255
]
NLCD_CLASS_TO_IDX = {
    cl: i for i, cl in enumerate(NLCD_CLASSES)
}

COLOR_MAP_NLCD = np.array([
    [0,0,1],
    [1,1,1],
    [0.6,0.6,0.3],
    [0.4,0.4,0.2],
    [0.2,0.2,0.1],
    [0.06,0.06,0.03],
    [0.4,0.4,0.6],
    [0,0.80,0],
    [0,0.55,0],
    [0,0.30,0],
    [0.85,0.85,0.85],
    [0.27,0.60,0.27],
    [0.35,0.76,0.35],
    [0.85,0.85,0.85],
    [0.85,0.85,0.85],
    [0.85,0.85,0.85],
    [0.70,1.00,0.70],
    [0.50,0.70,0.50],
    [0.0,0.55,0.3],
    [0.2,0.90,0.6],
    [1,0,0],
], dtype=np.float32)

COLOR_MAP_LC6 = np.array([
    [0,0,1],
    [0,0.5,0],
    [0.5,1,0.5],
    [0.48,0.48,0.12],
    [0.5,0.375,0.375],
    [0.10,0.10,0.10],
], dtype=np.float32)

COLOR_MAP_LC4 = np.array([
    [0,0,1],
    [0,0.5,0],
    [0.5,1,0.5],
    [0.5,0.375,0.375],
], dtype=np.float32)


def to_categorical(y, num_classes=None):
    """Converts a class vector (integers) to binary class matrix.
    E.g. for use with categorical_crossentropy.
    # Arguments
        y: class vector to be converted into a matrix
            (integers from 0 to num_classes).
        num_classes: total number of classes.
    # Returns
        A binary matrix representation of the input. The classes axis
        is placed last.
    """
    y = np.array(y, dtype='int')
    input_shape = y.shape
    if input_shape and input_shape[-1] == 1 and len(input_shape) > 1:
        input_shape = tuple(input_shape[:-1])
    y = y.ravel()
    if not num_classes:
        num_classes = np.max(y) + 1
    n = y.shape[0]
    categorical = np.zeros((n, num_classes), dtype=np.float32)
    categorical[np.arange(n), y] = 1
    output_shape = input_shape + (num_classes,)
    categorical = np.reshape(categorical, output_shape)
    return categorical


def to_one_hot(im, class_num):
    one_hot = np.zeros((class_num, im.shape[-2], im.shape[-1]), dtype=np.float32)
    for class_id in range(class_num):
        one_hot[class_id, :, :] = (im == class_id).astype(np.float32)
    return one_hot

def to_one_hot_batch(batch, class_num):
    one_hot = np.zeros((batch.shape[0], class_num, batch.shape[-2], batch.shape[-1]), dtype=np.float32)
    for class_id in range(class_num):
        one_hot[:, class_id, :, :] = (batch == class_id).astype(np.float32)
    return one_hot

def nlcd_to_img(img):
    return np.vectorize(NLCD_COLOR_MAP.__getitem__, signature='()->(n)')(img).astype(np.uint8)

def get_shape_layer_by_name(shapes, layer_name):
    for layer in shapes:
        if layer["name"] == layer_name:
            return layer
    return None

def get_random_string(length):
    alphabet = "abcdefghijklmnopqrstuvwxyz"
    return "".join([alphabet[np.random.randint(0, len(alphabet))] for i in range(length)])

