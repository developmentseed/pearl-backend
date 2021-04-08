import mercantile
import rasterio
from rasterio.warp import transform_geom


class MemRaster(object):

    def __init__(self, data, crs, tile, buffered = False):
        """A wrapper around the four pieces of information needed to define a raster datasource.

        Args:
            data (np.ndarray): The data in the raster. This should be formatted as "channels last", i.e. with shape (height, width, number of channels)
            crs (str): The EPSG code describing the coordinate system of this raster (e.g. "epsg:4326")
            bounds (tuple): A tuple in the format (left, bottom, right, top) / (xmin, ymin, xmax, ymax) describing the boundary of the raster data in the units of `crs`
        """
        assert len(data.shape) == 3
        #assert data.shape[2] < data.shape[1] and data.shape[2] < data.shape[0], "We assume that rasters should have larger height/width then number of channels"

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
        self.data = self.data[32:288, 32:288]

    def clip(self, polygon):
        geom = transform_geom("epsg:4326", "epsg:3857", polygon)
        clipped_output, clipped_transform = rasterio.mask.mask(dataset=self.data, shapes=[geom], nodata=255)
        return clipped_output
