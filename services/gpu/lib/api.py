import requests

class API():

    def __init__(self, url, token):
        self.url = url
        self.token = token

    def model_meta(self, model_id):
        r = requests.get(self.url + '/api/model/' + model_id, headers={
            "authorization": "Bearer " + self.token
        })

        print(r.json())

        return r.json()

    def model_download(self, model_id):
        r = requests.get(self.url + '/api/model/' + model_id + '/download', headers={
            "authorization": "Bearer " + self.token
        })

        open('/tmp/model.h5', 'wb').write(r.content)

        return '/tmp/model.h5'
