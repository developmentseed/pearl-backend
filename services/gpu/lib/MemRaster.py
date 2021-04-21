import mercantile
import rasterio
import supermercado
from rasterio.warp import transform_geom
from rasterio.transform import from_bounds
from rasterio.io import MemoryFile
import numpy as np


class MemRaster(object):

    def __init__(self, data, crs, tile, buffered = False):
        """A wrapper around the four pieces of information needed to define a raster datasource.

        Args:
            data (np.ndarray): The data in the raster. This should be formatted as "channels last", i.e. with shape (height, width, number of channels)
            crs (str): The EPSG code describing the coordinate system of this raster (e.g. "epsg:4326")
            bounds (tuple): A tuple in the format (left, bottom, right, top) / (xmin, ymin, xmax, ymax) describing the boundary of the raster data in the units of `crs`
        """
        self.tile = tile
        self.data = data
        self.crs = crs
        self.buffered = buffered

        self.x = tile[0]
        self.y = tile[1]
        self.z = tile[2]

        # Lat Lng bounds
        self.xy_bounds = mercantile.xy_bounds(self.x, self.y, self.z)
        self.bounds = mercantile.bounds(self.x, self.y, self.z)
        self.shape = data.shape

    def remove_buffer(self):
        if self.buffered:
            self.data = self.data[32:288, 32:288]
            self.buffered = False
        return self

    def clip(self, bounds):
        geom = transform_geom("epsg:4326", "epsg:3857", polygon)
        transform = from_bounds(*self.xy_bounds, 256, 256)

        with MemoryFile() as memfile:
            with memfile.open(driver='GTiff',
                dtype='uint8',
                crs='EPSG:3857',
                count=1,
                transform=transform,
                height=256,
                width=256,
                nodata=255) as dataset:
                    dataset.write(np.expand_dims(self.data, axis=0))

                    clipped_output, clipped_transform = rasterio.mask.mask(dataset=dataset, shapes=[geom], nodata=255)
        self.data = clipped_output[0]
        return self
