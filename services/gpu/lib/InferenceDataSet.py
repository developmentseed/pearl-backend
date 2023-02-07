import sys

import numpy as np
import albumentations as A
from albumentations.pytorch import ToTensorV2
from torch.utils.data.dataset import Dataset

EJE_MEAN = np.asarray([19.27930406, 16.32866561, 11.00430714, 51.38230159, 255.0])
EJE_STD = np.asarray([15.44816624, 12.1612895, 11.40836373, 16.50995133, 0.0])

class InferenceDataSet(Dataset):
    def __init__(self, api, tiles, tfm=None):
        self.api = api
        self.tiles = tiles
        self.tfm = A.Compose([
                A.Normalize(mean=EJE_MEAN[:3], std=EJE_STD[:3], max_pixel_value=1.0),
                ToTensorV2()
            ])

    def __getitem__(self, idx):
        zxy = self.tiles[idx]

        in_memraster = False
        while in_memraster is False:
            try:
                in_memraster = self.api.get_tile(zxy.z, zxy.x, zxy.y)
            except:
                print("InferenceDataSet ERROR", sys.exc_info()[0])
        tile = in_memraster.data
        tile = tile.transpose(1,2,0)
        tile = self.tfm(image=tile)["image"]
        return (
            tile,
            np.array([in_memraster.x, in_memraster.y, in_memraster.z]),
        )  # to-do also return x,y,z

    def __len__(self):
        return len(self.tiles)
