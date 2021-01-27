import requests
import os.path
from os import path
import logging

LOGGER = logging.getLogger("server")

class API():

    def __init__(self, url, token, instance_id):
        self.url = url
        self.token = token

        self.instance = self.instance_meta(instance_id)
        self.model = self.model_meta(self.instance['model_id'])

        self.model_fs = self.model_download(self.instance['model_id'])

    def instance_meta(self, instance_id):
        url = self.url + '/api/instance/' + str(instance_id)

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        return r.json()

    def model_meta(self, model_id):
        url = self.url + '/api/model/' + str(model_id)

        LOGGER.info("ok - GET " + url)
        r = requests.get(url, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        return r.json()

    def model_download(self, model_id):
        model_fs = '/tmp/model-{}.h5'.format(model_id)

        if not path.exists(model_fs):
            url = self.url + '/api/model/' + str(model_id) + '/download'

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
