import numpy as np

import rasterio
from rasterio.windows import Window
from rasterio.errors import RasterioIOError

import torch
from torch.utils.data.dataset import Dataset

class DataLoader(Dataset):
    def __init__(self, modelsrv):
        self.modelsrv = modelsrv

    def __getitem__(self, idx):
        zxy = self.aoi.tiles[idx];

        in_memraster = self.modelsrv.api.get_tile(zxy.z, zxy.x, zxy.y)
        tile = in_memraster.data
        tile = np.moveaxis(tile, -1, 0) #go from channels last to channels first (all MVP pytorch models will want the image tile to be (4, 256, 256))
        tile = tile / 255.0
        tile = tile.astype(np.float32)

        return tile

    def __len__(self):
        return self.aoi.total
