import os
import jwt
import json
import shutil
import logging
import zipfile
import urllib3
import requests
import numpy as np
import urllib.parse
from io import BytesIO
from os import path
from .MemRaster import MemRaster
from tiletanic import tileschemes
from shapely.geometry import mapping
from requests.adapters import HTTPAdapter
from requests_toolbelt.multipart.encoder import MultipartEncoder
import http.client as http_client

LOGGER = logging.getLogger("server")

tiler = tileschemes.WebMercator()

# Cached Mosaics
AVAILABLE_MOSAICS = {}

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
        adapter = HTTPAdapter(
            max_retries=urllib3.util.Retry(
                total=10,
                backoff_factor=0.1,
                allowed_methods=False,
                status_forcelist=[429, 500, 502, 503, 504],
            )
        )

        self.requests.mount("https://", adapter)
        self.requests.mount("http://", adapter)

        self.server = self.server_meta()
        self.instance = self.instance_meta(instance_id)

        self.instance_id = instance_id
        self.project_id = self.instance["project_id"]

        if self.instance.get("batch") is not None:
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

        self.model = self.model_meta()
        self.model_dir = self.model_download()

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

    def create_patch(self, aoi_id, timeframe_id):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/aoi/"
            + str(aoi_id)
            + "/timeframe/"
            + str(timeframe_id)
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

    def upload_patch(self, aoiid, timeframeid, patchid, geotiff):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/aoi/"
            + str(aoiid)
            + "/timeframe/"
            + str(timeframeid)
            + "/patch/"
            + str(patchid)
            + "/upload"
        )

        LOGGER.info("ok - POST " + url)

        geo_path = self.tmp_dir + "/aoi-{}-patch-{}.tiff".format(timeframeid, patchid)
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

    def timeframe_meta(self, timeframeid):
        url = self.url + "/api/timeframe/" + str(timeframeid)

        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url, headers={"authorization": "Bearer " + self.token})

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def create_aoi(self, aoi):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/aoi"
        )

        LOGGER.info("ok - POST " + url)
        r = self.requests.post(
            url,
            headers={
                "authorization": "Bearer " + self.token,
                "content-type": "application/json",
            },
            data=json.dumps(
                {"name": aoi["name"], "bounds": aoi["bounds"]}
            ),
        )

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def create_timeframe(self, timeframe):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/aoi/"
            + str(timeframe.aoi_id)
            + "/timeframe"
        )

        LOGGER.info("ok - POST " + url)
        r = self.requests.post(
            url,
            headers={
                "authorization": "Bearer " + self.token,
                "content-type": "application/json",
            },
            data=json.dumps(
                {"checkpoint_id": timeframe.checkpointid, "mosaic": timeframe.mosaic}
            ),
        )

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def upload_timeframe(self, aoiid, timeframeid, geotiff):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/aoi/"
            + str(aoiid)
            + "/timeframe/"
            + str(timeframeid)
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

    def get_mosaic(self, mosaic):
        url = (
            self.url
            + "/api/mosaic/"
            + mosaic
        )

        LOGGER.info("ok - GET " + url)

        r = self.requests.get(
            url, headers={"authorization": "Bearer " + self.token}
        )

        LOGGER.info("ok - Received " + url)

        r.raise_for_status()

        return r.json()

    def get_tilejson(self, mosaic):
        if AVAILABLE_MOSAICS.get(mosaic) is None:
            AVAILABLE_MOSAICS[mosaic] = self.get_mosaic(mosaic)

        _mosaic = AVAILABLE_MOSAICS[mosaic]
        searchid = _mosaic["id"]
        params = _mosaic.get("params", {})
        url = os.environ["PcTileUrl"] + f"/api/data/v1/mosaic/{searchid}/tilejson.json"

        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url, params=params)

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def get_tile(self, mosaic, z, x, y, iformat="npy", buffer=32, cache=True):
        if AVAILABLE_MOSAICS.get(mosaic) is None:
            AVAILABLE_MOSAICS[mosaic] = self.get_mosaic(mosaic)

        _mosaic = AVAILABLE_MOSAICS[mosaic]

        searchid = _mosaic["id"]
        params = _mosaic.get("params", {})
        params.update({ "return_mask": False, "buffer": buffer })

        shape = self.model.get('model_inputshape', [256, 256, 4])
        if shape[0] != shape[1]:
            LOGGER.warn("not ok - model.inputshape[0] should equal model.inputshape[1] - defaulting to model.inputshape[0]");
            shape[1] = shape[0]
        if (shape[0] / 256).is_integer() is False:
            LOGGER.warn("not ok - model.inputshape[0] should be a multiple of 256 - defaulting to 256");
            shape[0] = 256
            shape[1] = 256
        if shape[2] < 3:
            LOGGER.warn("not ok - model.inputshape[2] should be at least 3 - defaulting to 3");
            shape[2] = 3


        scale = shape[0] / 256;

        if scale >= 4:
            LOGGER.warn("not ok - scale cannot be greater than 3 - setting to 2 (512x512px)");
            scale = 2; # 512px

        params.update({ "scale": int(scale) });

        url = (os.environ["PcTileUrl"] + f"/api/data/v1/mosaic/tiles/{searchid}/{z}/{x}/{y}.{iformat}")

        if iformat == "npy":
            tmpfs = "{}/tiles/{}-{}-{}.{}".format(self.tmp_dir, x, y, z, iformat)
            res = False

            if not cache or not os.path.isfile(tmpfs):
                paramstp = [];
                for item in params.items():
                    if isinstance(item[1], list):
                        for value in item[1]:
                            paramstp.append((item[0], value))
                    else:
                        paramstp.append(item)

                paramstp = urllib.parse.urlencode(paramstp, safe=':+')

                LOGGER.info("ok - GET " + url + " " + str(paramstp))

                r = self.requests.get(url, params=paramstp)

                r.raise_for_status()
                LOGGER.info("ok - Received " + url)

                res = np.load(BytesIO(r.content))

                assert res.shape == (shape[2], shape[0] + buffer * 2, shape[1] + buffer * 2), "Unexpected Raster Numpy array"
                res = np.moveaxis(res, 0, -1)
                res = res[..., :shape[2]]
                assert res.shape == (shape[0] + buffer * 2, shape[1] + buffer * 2, shape[2]), "Failed to reshape numpy array"

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
            r = self.requests.get(url, params=params)

            r.raise_for_status()
            LOGGER.info("ok - Received " + url)

            return r.content

    def instance_patch(self, timeframe_id=None, checkpoint_id=None):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/instance/"
            + str(self.instance_id)
        )

        data = {}
        if timeframe_id is not None:
            data["timeframe_id"] = timeframe_id
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
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/batch/"
            + str(self.instance.get("batch"))
        )

        LOGGER.info("ok - GET " + url)
        r = self.requests.get(url, headers={"authorization": "Bearer " + self.token})

        r.raise_for_status()

        LOGGER.info("ok - Received " + url)
        return r.json()

    def batch_patch(self, body):
        url = (
            self.url
            + "/api/project/"
            + str(self.project_id)
            + "/batch/"
            + str(self.instance.get("batch"))
        )

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
