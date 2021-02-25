import base64
import io
import mercantile
import numpy as np
from PIL import Image


class PX:
    def __init__(xyz, px):
        self.x, self.y, self.z = xyz
        self.px


def geom2px(geom, zoom):
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
        xyz = mercantile.tile(coord[0], coord[1], zoom)


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
