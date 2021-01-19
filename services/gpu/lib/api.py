import requests

class API():

    def __init__(self, url, token):
        self.url = url
        self.token = token

    def model(self, model_id):
        r = requests.get(self.url + '/api/model/' + model_id, headers={
            "authorization": "Bearer " + self.token
        })

        print(r.json())

        return r.json()
