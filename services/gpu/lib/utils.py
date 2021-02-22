import base64
import io
import numpy as np
from PIL import Image

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
