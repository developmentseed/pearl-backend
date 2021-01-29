import json
import requests
import pyproj
import numpy as np
from os import path
import logging
import geojson
from shapely.ops import transform
from shapely.geometry import shape
from tiletanic import tilecover, tileschemes
import mercantile

LOGGER = logging.getLogger("server")

tiler = tileschemes.WebMercator()

class API():

    def __init__(self, url, token, instance_id):
        self.url = url
        self.token = token

        self.instance = self.instance_meta(instance_id)

        self.instance_id = instance_id
        self.model_id = self.instance['model_id']
        self.mosaic_id = self.instance['mosaic']

        self.mosaic = self.get_tilejson()
        self.model = self.model_meta()
        self.model_fs = self.model_download()

    def get_tilejson(self):
        url = self.url + '/api/mosaic/' + self.mosaic_id

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        return r.json()

    def get_tile_by_geom(self, geom):
        poly = shape(geojson.loads(json.dumps(geom)))

        project = pyproj.Transformer.from_proj(
            pyproj.Proj('epsg:4326'),
            pyproj.Proj('epsg:3857'),
            always_xy=True
        )

        print(self.mosaic)
        poly = transform(project.transform, poly)

        zxys = tilecover.cover_geometry(tiler, poly, self.mosaic['maxzoom'])

        tiles = []
        for zxy in zxys:
            tiles.append(self.get_tile(zxy.z, zxy.x, zxy.y))

        return tiles

    def get_tile(self, z, x, y, iformat='npy'):
        url = self.url + '/api/mosaic/{}/tiles/{}/{}/{}.{}'.format(self.mosaic_id, z, x, y, iformat)

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        if format == 'npi':
            return np.load(r.content)
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
