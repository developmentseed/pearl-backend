import json
import requests
import pyproj
from io import BytesIO
import numpy as np
from os import path
import logging
import geojson
from shapely.ops import transform
from shapely.geometry import shape
from tiletanic import tilecover, tileschemes
from shapely.geometry import box, mapping
from .MemRaster import MemRaster
import mercantile

LOGGER = logging.getLogger("server")

tiler = tileschemes.WebMercator()

class API():

    def __init__(self, url, token, instance_id):
        self.url = url
        self.token = token

        self.server = self.server_meta()
        self.instance = self.instance_meta(instance_id)

        self.project_id = self.instance['project_id']
        self.instance_id = instance_id
        self.model_id = self.instance['model_id']
        self.mosaic_id = self.instance['mosaic']

        self.model = self.model_meta()
        self.model_fs = self.model_download()
        self.mosaic = self.get_tilejson()
        self.project = self.project_meta()

    def server_meta(self):
        url = self.url + '/api'

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        return r.json()

    def create_aoi(self, bounds):
        url = self.url + '/api/instance/' + self.instance_id + '/aoi'

        LOGGER.info("ok - POST " + url)
        r = requests.post(url,
            headers={
                "authorization": "Bearer " + self.token,
                "content-type": "application/json"
            },
            data = json.dumps({
                'bounds': mapping(box(*bounds))
            })
        )

        r.raise_for_status()

        return r.json()

    def upload_aoi(self, geotiff):
        url = self.url + '/api/instance/' + self.instance_id + '/aoi/upload'

        LOGGER.info("ok - POST " + url)
        r = requests.post(url,
            headers={
                "authorization": "Bearer " + self.token,
                "content-type": "application/json"
            },
            data = geotiff
        )

        r.raise_for_status()

        return r.json()

    def get_tilejson(self):
        url = self.url + '/api/mosaic/' + self.mosaic_id

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        return r.json()

    def get_tile(self, z, x, y, iformat='npy'):
        url = self.url + '/api/mosaic/{}/tiles/{}/{}/{}.{}?return_mask=False'.format(self.mosaic_id, z, x, y, iformat)

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        if iformat == 'npy':
            res = np.load(BytesIO(r.content))

            assert res.shape == (4, 256, 256), "Unexpeccted Raster Numpy array"
            res = np.moveaxis(res, 0, -1)
            assert res.shape == (256, 256, 4), "Failed to reshape numpy array"

            memraster = MemRaster(
                res,
                "epsg:3857",
                (x, y, z)
            )

            return memraster
        else:
            return r.content

    def instance_meta(self, instance_id):
        url = self.url + '/api/instance/' + str(instance_id)

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        return r.json()

    def project_meta(self):
        url = self.url + '/api/project/' + str(self.project_id)

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        return r.json()

    def model_meta(self):
        url = self.url + '/api/model/' + str(self.model_id)

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        return r.json()

    def model_download(self):
        model_fs = '/tmp/model-{}.h5'.format(self.model_id)

        if not path.exists(model_fs):
            url = self.url + '/api/model/' + str(self.model_id) + '/download'

            LOGGER.info("ok - GET " + url)

            r = requests.get(url, headers={
                "authorization": "Bearer " + self.token
            })

            r.raise_for_status()

            open(model_fs, 'wb').write(r.content)
        else:
            LOGGER.info("ok - using cached model")

        LOGGER.info("ok - model: " + model_fs)

        return model_fs
