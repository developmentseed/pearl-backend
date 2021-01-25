import requests
import os.path
from os import path

class API():

    def __init__(self, url, token):
        self.url = url
        self.token = token

    def model_meta(self, model_id):
        r = requests.get(self.url + '/api/model/' + model_id, headers={
            "authorization": "Bearer " + self.token
        })

        r.raise_for_status()

        return r.json()

    def model_download(self, model_id):
        model_fs = '/tmp/model-{}.h5'.format(model_id)

        if not path.exists(model_fs):
            r = requests.get(self.url + '/api/model/' + model_id + '/download', headers={
                "authorization": "Bearer " + self.token
            })

            r.raise_for_status()

            open(model_fs, 'wb').write(r.content)

        return model_fs
