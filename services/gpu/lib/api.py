import json
import logging
import os
import shutil
import zipfile
from io import BytesIO
from os import path


import jwt

import numpy as np

import requests
import urllib3
from requests.adapters import HTTPAdapter
from requests_toolbelt.multipart.encoder import MultipartEncoder
from shapely.geometry import mapping
from tiletanic import tileschemes

from .MemRaster import MemRaster

LOGGER = logging.getLogger("server")

tiler = tileschemes.WebMercator()


class API:
    def __init__(self, url, instance_id):
        self.url = url

        self.token = "api." + jwt.encode(
            {"t": "admin", "i": os.environ["INSTANCE_ID"]},
            os.environ["SigningSecret"],
            algorithm="HS256",
        )

        # Temp Directories
        self.dir = "/tmp/"

        self.tmp_dir = "/tmp/gpu-api"
        if os.path.exists(self.tmp_dir) and os.path.isdir(self.tmp_dir):
            shutil.rmtree(self.tmp_dir)

        self.tmp_checkpoints = self.tmp_dir + "/checkpoints"
        self.tmp_tiles = self.tmp_dir + "/tiles"
        self.tmp_model = self.tmp_dir + "/model"

        os.makedirs(self.tmp_dir, exist_ok=True)
        os.makedirs(self.tmp_checkpoints, exist_ok=True)
        os.makedirs(self.tmp_tiles, exist_ok=True)
        os.makedirs(self.tmp_model, exist_ok=True)

        self.requests = requests.Session()
        self.requests.mount(
            url,
            HTTPAdapter(
                max_retries=urllib3.util.Retry(
                    total=10, backoff_factor=0.1, status_forcelist=[500, 502, 503, 504]
                )
            ),
        )

        self.server = self.server_meta()
        self.instance = self.instance_meta(instance_id)

        self.instance_id = instance_id
        self.project_id = self.instance["project_id"]

        if type(self.instance.get('batch')) == int:
            self.batch = self.batch_meta()
        else:
            self.batch = False

        self.token = "api." + jwt.encode(
            {"t": "admin", "p": self.project_id, "i": self.instance_id},
            os.environ["SigningSecret"],
            algorithm="HS256",
        )

        self.project = self.project_meta()

        self.model_id = self.project["model_id"]
        self.mosaic_id = self.project["mosaic"]

        self.model = self.model_meta()
        self.model_dir = self.model_download()
        self.mosaic = self.get_tilejson()

    def server_meta(self):
        url = self.url + "/api"

        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url, headers={"authorization": "Bearer " + self.token})

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def create_checkpoint(
        self, name, parent, classes, retrain_geoms, input_geoms, analytics=None
    ):
        url = self.url + "/api/project/" + str(self.project_id) + "/checkpoint"

        data = {
            "name": name,
            "classes": classes,
        }

        if parent is not None:
            data["parent"] = parent

        if retrain_geoms is not None:
            data["retrain_geoms"] = retrain_geoms

        if input_geoms is not None:
            data["input_geoms"] = input_geoms

        if analytics is not None:
            data["analytics"] = analytics

        LOGGER.info("ok - POST " + url)
        r = self.requests.post(
            url,
            headers={
                "authorization": "Bearer " + self.token,
                "content-type": "application/json",
            },
            data=json.dumps(data),
        )
        r.raise_for_status()

        LOGGER.info("ok - Received " + url)

        body = r.json()

        os.makedirs(self.tmp_checkpoints + "/" + str(body["id"]), exist_ok=True)

        return body

    def get_checkpoint(self, checkpointid):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/checkpoint/"
            + str(checkpointid)
        )
        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url, headers={"authorization": "Bearer " + self.token})

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)

        body = r.json()
        for i, d2 in enumerate(body["classes"]):
            d2.update(body["analytics"][i])

        return body

    def upload_checkpoint(self, checkpointid):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/checkpoint/"
            + str(checkpointid)
            + "/upload"
        )

        LOGGER.info("ok - POST " + url)

        ch_dir = self.tmp_checkpoints + "/" + str(checkpointid)

        zip_fs = self.tmp_dir + "/checkpoints/checkpoint-{}.zip".format(checkpointid)

        zipf = zipfile.ZipFile(zip_fs, "w", zipfile.ZIP_DEFLATED)
        for root, dirs, files in os.walk(ch_dir):
            for file in files:
                zipf.write(
                    os.path.join(root, file),
                    os.path.relpath(
                        os.path.join(root, file), os.path.join(ch_dir, "..")
                    ),
                )
        zipf.close()

        encoder = MultipartEncoder(
            [("file", ("filename", open(zip_fs, "rb"), "application/zip"))]
        )

        r = self.requests.post(
            url,
            headers={
                "Authorization": "Bearer " + self.token,
                "Content-Type": encoder.content_type,
            },
            data=encoder,
        )

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def download_checkpoint(self, checkpointid):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/checkpoint/"
            + str(checkpointid)
            + "/download"
        )

        LOGGER.info("ok - GET " + url)

        ch_dir = self.tmp_checkpoints + "/" + str(checkpointid)

        r = self.requests.get(
            url,
            headers={
                "Authorization": "Bearer " + self.token,
            },
        )

        r.raise_for_status()

        ch_zip_fs = self.tmp_dir + "/checkpoint-{}.zip".format(checkpointid)
        with open(ch_zip_fs, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024):
                if chunk:
                    f.write(chunk)
                    f.flush()
                    os.fsync(f.fileno())

        LOGGER.info("ok - Received " + url)

        ch_dir = self.tmp_checkpoints + "/" + str(checkpointid)
        os.makedirs(ch_dir, exist_ok=True)

        with zipfile.ZipFile(ch_zip_fs, "r") as zip_ref:
            zip_ref.extractall(self.tmp_checkpoints)

        return ch_dir

    def create_patch(self, aoi_id):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/aoi/"
            + str(aoi_id)
            + "/patch"
        )

        LOGGER.info("ok - POST " + url)
        r = self.requests.post(
            url,
            headers={
                "authorization": "Bearer " + self.token,
                "content-type": "application/json",
            },
        )

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def upload_patch(self, aoiid, patchid, geotiff):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/aoi/"
            + str(aoiid)
            + "/patch/"
            + str(patchid)
            + "/upload"
        )

        LOGGER.info("ok - POST " + url)

        geo_path = self.tmp_dir + "/aoi-{}-patch-{}.tiff".format(aoiid, patchid)
        with open(geo_path, "wb") as filehandle:
            filehandle.write(geotiff.read())

        encoder = MultipartEncoder(
            [("file", ("filename", open(geo_path, "rb"), "image/tiff"))]
        )

        r = self.requests.post(
            url,
            headers={
                "Authorization": "Bearer " + self.token,
                "Content-Type": encoder.content_type,
            },
            data=encoder,
        )

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def aoi_meta(self, aoiid):
        url = self.url + "/api/project/" + str(self.project_id) + "/aoi/" + str(aoiid)

        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url, headers={"authorization": "Bearer " + self.token})

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def create_aoi(self, aoi):
        url = self.url + "/api/project/" + str(self.project_id) + "/aoi"

        LOGGER.info("ok - POST " + url)
        r = self.requests.post(
            url,
            headers={
                "authorization": "Bearer " + self.token,
                "content-type": "application/json",
            },
            data=json.dumps(
                {
                    "name": aoi.name,
                    "checkpoint_id": aoi.checkpointid,
                    "bounds": mapping(aoi.poly),
                }
            ),
        )

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def upload_aoi(self, aoiid, geotiff):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/aoi/"
            + str(aoiid)
            + "/upload"
        )

        LOGGER.info("ok - POST " + url)

        geo_path = self.tmp_dir + "/aoi-{}.tiff".format(aoiid)
        with open(geo_path, "wb") as filehandle:
            filehandle.write(geotiff.read())

        encoder = MultipartEncoder(
            [("file", ("filename", open(geo_path, "rb"), "image/tiff"))]
        )

        r = self.requests.post(
            url,
            headers={
                "Authorization": "Bearer " + self.token,
                "Content-Type": encoder.content_type,
            },
            data=encoder,
        )

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def get_tilejson(self):
        url = os.environ["TileUrl"] + "/mosaic/" + self.mosaic_id + "/tilejson.json"

        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url)

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def get_tile(self, z, x, y, iformat="npy", buffer=32, cache=True):
        url = os.environ[
            "TileUrl"
        ] + "/mosaic/{}/tiles/{}/{}/{}.{}?buffer={}&return_mask=False".format(
            self.mosaic_id, z, x, y, iformat, buffer
        )

        if iformat == "npy":
            tmpfs = "{}/tiles/{}-{}-{}.{}".format(self.tmp_dir, x, y, z, iformat)
            res = False

            if not cache or not os.path.isfile(tmpfs):
                LOGGER.info("ok - GET " + url)
                r = self.requests.get(url)

                r.raise_for_status()
                LOGGER.info("ok - Received " + url)

                res = np.load(BytesIO(r.content))

                assert res.shape == (4, 320, 320), "Unexpeccted Raster Numpy array"
                res = np.moveaxis(res, 0, -1)
                assert res.shape == (320, 320, 4), "Failed to reshape numpy array"

                np.save("{}/tiles/{}-{}-{}.npy".format(self.tmp_dir, x, y, z), res)
            else:
                res = np.load(tmpfs)

            memraster = MemRaster(
                res,
                "epsg:3857",
                (x, y, z),
                buffer,  # set buffered to px to retrain properties for original tile
            )

            return memraster
        else:
            LOGGER.info("ok - GET " + url)
            r = self.requests.get(
                url, headers={"authorization": "Bearer " + self.token}
            )

            r.raise_for_status()
            LOGGER.info("ok - Received " + url)

            return r.content

    def instance_patch(self, aoi_id=None, checkpoint_id=None):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/instance/"
            + str(self.instance_id)
        )

        data = {}
        if aoi_id is not None:
            data["aoi_id"] = aoi_id
        if checkpoint_id is not None:
            data["checkpoint_id"] = checkpoint_id

        LOGGER.info("ok - PATCH " + url)
        r = self.requests.patch(
            url,
            headers={
                "authorization": "Bearer " + self.token,
                "content-type": "application/json",
            },
            data=json.dumps(data),
        )

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def batch_meta(self):
        url = self.url + "/api/project/" + str(self.project_id) + "/batch/" + str(self.instance.get('batch'))

        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url, headers={"authorization": "Bearer " + self.token})

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def batch_patch(self, body):
        url = self.url + "/api/project/" + str(self.project_id) + "/batch/" + str(self.instance.get('batch'))

        LOGGER.info("ok - PATCH " + url)
        r = self.requests.patch(
            url,
            headers={
                "authorization": "Bearer " + self.token,
                "content-type": "application/json",
            },
            data=json.dumps(body),
        )

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def instance_meta(self, instance_id):
        url = self.url + "/api/instance/" + str(instance_id)

        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url, headers={"authorization": "Bearer " + self.token})

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def project_meta(self):
        url = self.url + "/api/project/" + str(self.project_id)

        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url, headers={"authorization": "Bearer " + self.token})

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def model_meta(self):
        url = self.url + "/api/model/" + str(self.model_id)

        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url, headers={"authorization": "Bearer " + self.token})

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def model_download(self):
        model_fs = self.dir + "/model-{}.zip".format(self.model_id)

        if not path.exists(model_fs):
            url = self.url + "/api/model/" + str(self.model_id) + "/download"

            LOGGER.info("ok - GET " + url)

            r = self.requests.get(
                url, headers={"authorization": "Bearer " + self.token}
            )

            r.raise_for_status()

            open(model_fs, "wb").write(r.content)
        else:
            LOGGER.info("ok - using cached model")

        with zipfile.ZipFile(model_fs, "r") as zip_ref:
            zip_ref.extractall(self.tmp_model)

        LOGGER.info("ok - model: " + self.tmp_model)

        return self.tmp_model
