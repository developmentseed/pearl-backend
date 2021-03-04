from collections.abc import Iterable
import base64
import sys
import io
import math
import mercantile
import numpy as np
from rasterio.transform import from_bounds
from PIL import Image

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

        pxs.append(PX(coords, xy, xyz, pixels, value))

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
