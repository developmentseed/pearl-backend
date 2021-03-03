import os
import json
import requests
import pyproj
import numpy as np
import logging
import geojson
import mercantile
import zipfile
from os import path
from io import BytesIO
from requests_toolbelt.multipart.encoder import MultipartEncoder
from shapely.ops import transform
from shapely.geometry import shape
from tiletanic import tilecover, tileschemes
from shapely.geometry import box, mapping
from .MemRaster import MemRaster

LOGGER = logging.getLogger("server")

tiler = tileschemes.WebMercator()

class API():

    def __init__(self, url, token, instance_id):
        self.url = url
        self.token = token

        self.tmp_dir = '/tmp/gpu-api/'

        os.makedirs(self.tmp_dir, exist_ok=True)
        os.makedirs(self.tmp_dir + '/tiles', exist_ok=True)
        os.makedirs(self.tmp_dir + '/checkpoints', exist_ok=True)

        self.server = self.server_meta()
        self.instance = self.instance_meta(instance_id)

        self.project_id = self.instance['project_id']
        self.instance_id = instance_id
        self.project = self.project_meta()

        self.model_id = self.project['model_id']
        self.mosaic_id = self.project['mosaic']

        self.model = self.model_meta()
        self.model_fs = self.model_download()
        self.mosaic = self.get_tilejson()

    def server_meta(self):
        url = self.url + '/api'

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def create_checkpoint(self, name, classes):
        url = self.url + '/api/project/' + str(self.project_id) + '/checkpoint'

        LOGGER.info("ok - POST " + url)
        r = requests.post(url,
            headers={
                "authorization": "Bearer " + self.token,
                "content-type": "application/json"
            },
            data = json.dumps({
                'name': name,
                'classes': classes
            })
        )

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def upload_checkpoint(self, checkpointid, ch_dir):
        url = self.url + '/api/project/' + str(self.project_id) + '/checkpoint/' + str(checkpointid) + '/upload'

        LOGGER.info("ok - POST " + url)

        zip_fs = self.tmp_dir + 'checkpoints/checkpoint-{}.zip'.format(checkpointid)

        zipf = zipfile.ZipFile(zip_fs, 'w', zipfile.ZIP_DEFLATED)
        for root, dirs, files in os.walk(ch_dir):
            for file in files:
                zipf.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), os.path.join(ch_dir, '..')))
        zipf.close()

        encoder = MultipartEncoder([('file', ('filename', open(zip_fs, 'rb'), 'application/zip'))])

        r = requests.post(url,
            headers={
                "Authorization": "Bearer " + self.token,
                'Content-Type': encoder.content_type
            },
            data = encoder
        )

        print(r.content)

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def create_aoi(self, bounds):
        url = self.url + '/api/project/' + str(self.project_id) + '/aoi'

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

        LOGGER.info("ok - Received " + url)
        return r.json()

    def upload_aoi(self, aoiid, geotiff):
        url = self.url + '/api/project/' + str(self.project_id) + '/aoi/' + str(aoiid) + '/upload'

        LOGGER.info("ok - POST " + url)

        geo_path = self.tmp_dir + '/aoi-{}.geotiff'.format(aoiid)
        with open(geo_path, 'wb') as filehandle:
            filehandle.write(geotiff.read())

        encoder = MultipartEncoder([('file', ('filename', open(geo_path, 'rb'), 'image/tiff'))])

        r = requests.post(url,
            headers={
                "Authorization": "Bearer " + self.token,
                'Content-Type': encoder.content_type
            },
            data = encoder
        )

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def get_tilejson(self):
        url = self.url + '/api/mosaic/' + self.mosaic_id

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def get_tile(self, z, x, y, iformat='npy', cache=True):
        url = self.url + '/api/mosaic/{}/tiles/{}/{}/{}.{}?return_mask=False'.format(self.mosaic_id, z, x, y, iformat)

        if iformat == 'npy':
            tmpfs = '{}/tiles/{}-{}-{}.{}'.format(self.tmp_dir, x, y, z, iformat)
            res = False

            if cache or not os.path.isfile(tmpfs):
                LOGGER.info("ok - GET " + url)
                r = requests.get(url, headers={
                    "authorization": "Bearer " + self.token
                })

                r.raise_for_status()
                LOGGER.info("ok - Received " + url)

                res = np.load(BytesIO(r.content))

                assert res.shape == (4, 256, 256), "Unexpeccted Raster Numpy array"
                res = np.moveaxis(res, 0, -1)
                assert res.shape == (256, 256, 4), "Failed to reshape numpy array"

                np.save('{}/tiles/{}-{}-{}.npy'.format(self.tmp_dir, x, y, z), res)
            else:
                res = np.load(tmpfs)

            memraster = MemRaster(
                res,
                "epsg:3857",
                (x, y, z)
            )

            return memraster
        else:
            LOGGER.info("ok - GET " + url)
            r = requests.get(url, headers={
                "authorization": "Bearer " + self.token
            })

            r.raise_for_status()
            LOGGER.info("ok - Received " + url)

            return r.content

    def instance_meta(self, instance_id):
        url = self.url + '/api/instance/' + str(instance_id)

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def project_meta(self):
        url = self.url + '/api/project/' + str(self.project_id)

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def model_meta(self):
        url = self.url + '/api/model/' + str(self.model_id)

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def model_download(self):
        model_fs = self.tmp_dir + '/model-{}.pt'.format(self.model_id)

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

