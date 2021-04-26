import numpy as np
import sys

import rasterio
from rasterio.windows import Window
from rasterio.errors import RasterioIOError

import torch
from torch.utils.data.dataset import Dataset

class InferenceDataSet(Dataset):
    def __init__(self, api, tiles):
        self.api = api
        self.tiles = tiles


    def __getitem__(self, idx):
        zxy = self.tiles[idx]

        in_memraster = False
        while in_memraster is False:
            try:
                in_memraster = self.modelsrv.api.get_tile(zxy.z, zxy.x, zxy.y)
            except:
                print("ERROR", sys.exc_info()[0])
        tile = in_memraster.data
        tile = np.moveaxis(tile, -1, 0) #go from channels last to channels first (all MVP pytorch models will want the image tile to be (4, 256, 256))
        tile = tile / 255.0
        tile = tile.astype(np.float32)
        return (tile, np.array([in_memraster.x, in_memraster.y, in_memraster.z])) #to-do also return x,y,z

    def __len__(self):
        return len(self.tiles)
