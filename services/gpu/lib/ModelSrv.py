import json
import logging
import sys
import traceback

import numpy as np
import torch
from shapely.geometry import mapping

from .TimeFrame import TimeFrame
from .InferenceDataSet import InferenceDataSet
from .MemRaster import MemRaster
from .osm import OSM
from .utils import generate_random_points, geom2px, geom2coords, pred2png, pxs2geojson

LOGGER = logging.getLogger("server")


class ModelSrv:
    def __init__(self, model, api):

        self.timeframe = None
        self.chk = None
        self.processing = False
        self.api = api
        self.model = model

        if api.instance.get("checkpoint_id") is not None:
            self.meta_load_checkpoint(self.api.instance.get("checkpoint_id"))

        if api.instance.get("timeframe_id") is not None:
            self.timeframe = TimeFrame.load(
                self.api, self.api.instance.get("timeframe_id")
            )

        if api.batch is not False:
            self.prediction(
                {
                    "name": api.batch.get("name", "Default Batch"),
                    "polygon": api.batch.get("bounds"),
                }
            )

    def status(self, body, websocket):
        try:
            payload = {
                "processing": self.processing,
                "timeframe": False,
                "checkpoint": False,
            }

            if self.timeframe is not None:
                payload["timeframe"] = self.timeframe.id

            if self.chk is not None:
                payload["checkpoint"] = self.chk["id"]

            websocket.send(json.dumps({"message": "model#status", "data": payload}))

        except Exception as e:
            websocket.error("Model Status Error", e)
            raise e

    def patch(self, body, websocket):
        try:
            if self.processing is True:
                return is_processing(websocket)

            self.processing = True

            if self.timeframe is None:
                websocket.error("Cannot Patch as no TimeFrame is loaded")
                done_processing(self)
                return
            elif self.chk is None:
                websocket.error("Cannot Patch as no Checkpoint is loaded")
                done_processing(self)
                return

            # TODO Create AOI

            if body.get("type") == "class":
                patch = TimeFrame.create(
                    self.api,
                    body,
                    {"aoi_id": self.timeframe.aoi_id, "mosaic": self.timeframe.mosaic},
                    is_patch=self.timeframe.id,
                )

                websocket.send(
                    json.dumps(
                        {
                            "message": "model#patch",
                            "data": {
                                "id": patch.id,
                                "checkpoint_id": self.chk["id"],
                                "bounds": patch.bounds,
                                "total": patch.total,
                            },
                        }
                    )
                )

                color_list = [item["color"] for item in self.model.classes]

                while len(patch.tiles) > 0:
                    zxy = patch.tiles.pop()
                    output = MemRaster(
                        np.ones([256, 256], dtype=np.uint8) * body["class"],
                        "epsg:3857",
                        (zxy.x, zxy.y, zxy.z),
                    )

                    output.clip(patch.poly)

                    if patch.live:
                        # Create color versions of predictions
                        png = pred2png(output.data, color_list)

                        LOGGER.info("ok - returning patch inference")
                        websocket.send(
                            json.dumps(
                                {
                                    "message": "model#patch#progress",
                                    "data": {
                                        "patch": patch.id,
                                        "bounds": output.bounds,
                                        "x": output.x,
                                        "y": output.y,
                                        "z": output.z,
                                        "image": png,
                                        "total": patch.total,
                                        "processed": patch.total - len(patch.tiles),
                                    },
                                }
                            )
                        )
                    else:
                        websocket.send(
                            json.dumps(
                                {
                                    "message": "model#patch#progress",
                                    "data": {
                                        "patch": patch.id,
                                        "total": patch.total,
                                        "processed": len(patch.tiles),
                                    },
                                }
                            )
                        )

                    # Push tile into geotiff fabric
                    output = MemRaster(
                        np.expand_dims(output.data, axis=-1),
                        output.crs,
                        output.tile,
                        output.buffered,
                    )
                    patch.add_to_fabric(output)

                patch.upload_fabric()
                LOGGER.info("ok - done patch prediction")
            elif body.get("type") == "brush":
                current_checkpoint = self.chk["id"]
                self.meta_load_checkpoint(body["checkpoint_id"])

                aoi = self.api.create_aoi({
                    "name": "Manual Checkpoint Patch",
                    "bounds": body["polygon"]
                })

                patch = TimeFrame.create(
                    self.api,
                    aoi,
                    {
                        "checkpoint_id": body["checkpoint_id"],
                        "mosaic": self.timeframe.mosaic,
                    },
                    is_patch=self.timeframe.id,
                )
                websocket.send(
                    json.dumps(
                        {
                            "message": "model#patch",
                            "data": {
                                "id": patch.id,
                                "live": patch.live,
                                "checkpoint_id": self.chk["id"],
                                "bounds": patch.bounds,
                                "total": patch.total,
                            },
                        }
                    )
                )

                color_list = [item["color"] for item in self.model.classes]

                dataset = InferenceDataSet(self.api, self.timeframe)
                if torch.cuda.is_available():
                    batch_size = 8
                else:
                    batch_size = 2
                dataloader = torch.utils.data.DataLoader(
                    dataset,
                    batch_size=batch_size,
                    num_workers=2,
                    pin_memory=True,
                )

                current = 1
                for i, (data, xyz) in enumerate(dataloader):
                    xyz = xyz.numpy()
                    outputs = self.model.run(data, True)

                    for c, output in enumerate(outputs):
                        output = MemRaster(output, "epsg:3857", tuple(xyz[c]), True)

                        output = output.remove_buffer()
                        output = output.clip(patch.poly)

                    if patch.live:
                        # Create color versions of predictions
                        png = pred2png(output.data, color_list)

                        LOGGER.info("ok - returning patch inference")
                        websocket.send(
                            json.dumps(
                                {
                                    "message": "model#patch#progress",
                                    "data": {
                                        "patch": patch.id,
                                        "bounds": output.bounds,
                                        "x": output.x.item(),
                                        "y": output.y.item(),
                                        "z": output.z.item(),  # Convert from int64 to int
                                        "image": png,
                                        "total": patch.total,
                                        "processed": current,
                                    },
                                }
                            )
                        )
                    else:
                        websocket.send(
                            json.dumps(
                                {
                                    "message": "model#patch#progress",
                                    "data": {
                                        "patch": patch.id,
                                        "total": patch.total,
                                        "processed": current,
                                    },
                                }
                            )
                        )

                    current = current + 1

                    # Push tile into geotiff fabric
                    output = MemRaster(
                        np.expand_dims(output.data, axis=-1),
                        output.crs,
                        output.tile,
                        output.buffered,
                    )
                    patch.add_to_fabric(output)

                patch.upload_fabric()

                LOGGER.info("ok - done patch prediction")

                self.meta_load_checkpoint(current_checkpoint)

            websocket.send(
                json.dumps(
                    {
                        "message": "model#patch#complete",
                        "data": {
                            "patch": patch.id,
                        },
                    }
                )
            )

            done_processing(self)
        except Exception as e:
            done_processing(self)
            websocket.error("TimeFrame Patch Error", e)
            raise e

    def load_timeframe(self, body, websocket):
        try:
            if self.processing is True:
                return is_processing(websocket)

            self.processing = True

            websocket.send(
                json.dumps(
                    {
                        "message": "model#timeframe#progress",
                        "data": {"timeframe": body["id"], "processed": 0, "total": 1},
                    }
                )
            )

            self.timeframe = TimeFrame.load(self.api, body["id"])
            self.meta_load_checkpoint(self.timeframe.checkpointid)

            websocket.send(
                json.dumps(
                    {
                        "message": "model#timeframe#complete",
                        "data": {"timeframe": self.timeframe.id},
                    }
                )
            )

            done_processing(self)

        except Exception as e:
            done_processing(self)
            websocket.error("TimeFrame Load Error", e)
            raise e

    def load_checkpoint(self, body, websocket):
        try:
            if self.processing is True:
                return is_processing(websocket)

            self.processing = True

            websocket.send(
                json.dumps(
                    {
                        "message": "model#checkpoint#progress",
                        "data": {"checkpoint": body["id"], "processed": 0, "total": 1},
                    }
                )
            )

            self.meta_load_checkpoint(body["id"])

            websocket.send(
                json.dumps(
                    {
                        "message": "model#checkpoint#complete",
                        "data": {"checkpoint": body["id"]},
                    }
                )
            )

            done_processing(self)

        except Exception as e:
            done_processing(self)
            websocket.error("Checkpoint Load Error", e)
            raise e

    def prediction(self, body, websocket=False):
        try:
            if self.processing is True:
                return is_processing(websocket)

            LOGGER.info("ok - starting prediction")

            self.processing = True

            aoi = self.api.aoi_meta(body["aoi_id"])

            if self.chk is None:
                self.meta_save_checkpoint(
                    {
                        "name": aoi["name"],
                        "geoms": [None] * len(self.model.classes),
                        "analytics": [
                            {
                                "counts": cls.get("counts", 0),
                                "percent": cls.get("percent", 0),
                                "f1score": cls.get("retraining_f1score", 0),
                            }
                            for cls in self.model.classes
                        ],
                    },
                    websocket,
                )

            print(body)
            self.timeframe = TimeFrame.create(
                self.api,
                aoi,
                {"mosaic": body["mosaic"], "checkpoint_id": self.chk["id"]},
            )

            if websocket is not False:
                websocket.send(
                    json.dumps(
                        {
                            "message": "model#timeframe",
                            "data": {
                                "id": self.timeframe.id,
                                "live": self.timeframe.live,
                                "name": self.timeframe.name,
                                "checkpoint_id": self.chk["id"],
                                "bounds": self.timeframe.bounds,
                                "total": self.timeframe.total,
                            },
                        }
                    )
                )

            color_list = [item["color"] for item in self.model.classes]

            dataset = InferenceDataSet(self.api, self.timeframe)
            if torch.cuda.is_available():
                batch_size = 8
            else:
                batch_size = 2

            dataloader = torch.utils.data.DataLoader(
                dataset,
                batch_size=batch_size,
                num_workers=2,
                pin_memory=True,
            )

            current = 1
            progress = 0

            for i, (data, xyz) in enumerate(dataloader):
                xyz = xyz.numpy()
                outputs = self.model.run(data, True)

                for c, output in enumerate(outputs):
                    output = MemRaster(output, "epsg:3857", tuple(xyz[c]), True)

                    output = output.remove_buffer()

                    # clip output
                    output.clip(self.timeframe.poly)
                    LOGGER.info("ok - generated inference")

                    if self.timeframe.live and websocket is not False:
                        # Create color versions of predictions
                        png = pred2png(output.data, color_list)

                        LOGGER.info("ok - returning inference")

                        websocket.send(
                            json.dumps(
                                {
                                    "message": "model#prediction",
                                    "data": {
                                        "timeframe": self.timeframe.id,
                                        "bounds": output.bounds,
                                        "x": output.x.item(),
                                        "y": output.y.item(),
                                        "z": output.z.item(),  # Convert from int64 to int
                                        "image": png,
                                        "total": self.timeframe.total,
                                        "processed": current,
                                    },
                                }
                            )
                        )
                    elif websocket is not False:
                        websocket.send(
                            json.dumps(
                                {
                                    "message": "model#prediction",
                                    "data": {
                                        "timeframe": self.timeframe.id,
                                        "total": self.timeframe.total,
                                        "processed": current,
                                    },
                                }
                            )
                        )
                    else:
                        new_prog = int(
                            float(current) / float(self.timeframe.total) * 100
                        )

                        if progress != new_prog:
                            res = self.api.batch_patch({"progress": new_prog})

                            progress = new_prog

                            if res.get("abort") is True:
                                res = self.api.batch_patch(
                                    {"progress": 0, "completed": False}
                                )
                                done_processing(self)
                                LOGGER.info("ok - prediction aborted")
                                sys.exit()

                    current = current + 1

                    # Push tile into geotiff fabric
                    output = MemRaster(
                        np.expand_dims(output.data, axis=-1),
                        output.crs,
                        output.tile,
                        output.buffered,
                    )
                    self.timeframe.add_to_fabric(output)

            self.timeframe.upload_fabric()

            LOGGER.info("ok - done prediction")

            if websocket is not False:
                websocket.send(
                    json.dumps(
                        {
                            "message": "model#prediction#complete",
                            "data": {
                                "timeframe": self.timeframe.id,
                            },
                        }
                    )
                )
            else:
                self.api.batch_patch(
                    {"progress": 100, "completed": True, "timeframe": self.timeframe.id}
                )

                sys.exit()

            done_processing(self)
        except Exception as e:
            done_processing(self)

            traceback.print_exc()

            if websocket is False:
                self.api.batch_patch(
                    {"completed": False, "error": str("Processing Error: " + str(e))}
                )
            else:
                websocket.error("Processing Error", e)

            raise e

    def osm(self, body, websocket):
        try:
            if self.processing is True:
                return is_processing(websocket)
            self.processing = True

            osm = OSM(self.api.server.get("qa_tiles"))
            osm.download(body.get("bounds"))

            for cls in body.get("classes"):
                cls["file"] = osm.extract(cls)

            done_processing(self)

            self.retrain(
                {
                    "name": body.get("name"),
                    "classes": body.get("classes"),
                    "bounds": body.get("bounds"),
                },
                websocket,
            )

        except Exception as e:
            done_processing(self)
            websocket.error("OSM Error", e)
            raise e

    def retrain(self, body, websocket):
        try:
            if self.processing is True:
                return is_processing(websocket)
            self.processing = True

            if self.timeframe is None:
                websocket.error("Cannot Retrain as no TimeFrame is loaded")
                done_processing(self)
                return

            LOGGER.info("ok - starting retrain")

            total = 0
            for cls in body["classes"]:
                if cls.get("geometry") is None:
                    cls["geometry"] = {"type": "FeatureCollection", "features": []}

                cls["retrain_geometry"] = []
                for feature in cls["geometry"]["features"]:
                    if (
                        feature["geometry"]["type"] == "Polygon"
                        or feature["geometry"]["type"] == "MultiPolygon"
                    ):
                        points = generate_random_points(50, feature["geometry"])
                        cls["retrain_geometry"] = [
                            *cls["retrain_geometry"],
                            *geom2coords(points),
                        ]

                    elif (
                        feature["geometry"]["type"] == "MultiPoint"
                        and len(feature["geometry"]["coordinates"]) > 0
                    ):
                        cls["retrain_geometry"] = [
                            *cls["retrain_geometry"],
                            *geom2coords(feature["geometry"]),
                        ]

                if cls.get("file") is not None:
                    with open(cls["file"]) as f:
                        for feature in f.readlines():
                            feature = json.loads(feature)

                            points = generate_random_points(50, feature["geometry"])
                            cls["retrain_geometry"] = [
                                *cls["retrain_geometry"],
                                *geom2coords(points),
                            ]

                total += len(cls["retrain_geometry"])

            LOGGER.info("ok - generated %s sample pts", total)

            curr = 0
            for cls in body["classes"]:
                cls["retrain_geometry"] = geom2px(
                    cls["retrain_geometry"],
                    self,
                    websocket,
                    total,
                    curr,
                    body.get("bounds"),
                )

                curr += len(cls["retrain_geometry"])

            LOGGER.info("ok - generated %s PXs", total)

            if total != 0:
                self.model.retrain(body["classes"])

            LOGGER.info("ok - done retrain")

            if self.chk is None:
                parent = None
            else:
                parent = self.chk["id"]

            self.meta_save_checkpoint(
                {
                    "name": body["name"],
                    "parent": parent,
                    "input_geoms": [cls["geometry"] for cls in body["classes"]],
                    "retrain_geoms": pxs2geojson(
                        [cls["retrain_geometry"] for cls in body["classes"]]
                    ),
                    "analytics": [
                        {
                            "counts": cls.get("counts", 0),
                            "percent": cls.get("percent", 0),
                            "f1score": cls.get("retraining_f1score", 0),
                        }
                        for cls in self.model.classes
                    ],
                },
                websocket,
            )

            websocket.send(json.dumps({"message": "model#retrain#complete"}))

            done_processing(self)

            if self.timeframe is not None:
                self.prediction(
                    {"aoi_id": self.timeframe.aoi_id, "mosaic": self.timeframe.mosaic},
                    websocket,
                )

        except Exception as e:
            done_processing(self)
            websocket.error("Retrain Error", e)
            raise e

    def meta_load_checkpoint(self, load_id):
        self.chk = self.api.get_checkpoint(load_id)
        chk_fs = self.api.download_checkpoint(self.chk["id"])
        self.model.load_state_from(self.chk, chk_fs)
        self.api.instance_patch(checkpoint_id=self.chk["id"])

    def meta_load_timeframe(self, load_id):
        self.chk = self.api.get_checkpoint(load_id)
        chk_fs = self.api.download_checkpoint(self.chk["id"])
        self.model.load_state_from(self.chk, chk_fs)
        self.api.instance_patch(checkpoint_id=self.chk["id"])

    def meta_save_checkpoint(self, body, websocket):
        classes = []
        for cls in self.model.classes:
            classes.append({"name": cls["name"], "color": cls["color"]})

        checkpoint = self.api.create_checkpoint(
            body["name"],
            body.get("parent"),
            classes,
            body.get("retrain_geoms"),
            body.get("input_geoms"),
            body.get("analytics"),
        )
        self.model.save_state_to(self.api.tmp_checkpoints + "/" + str(checkpoint["id"]))
        self.api.upload_checkpoint(checkpoint["id"])
        self.api.instance_patch(checkpoint_id=checkpoint["id"])

        if websocket is not False:
            websocket.send(
                json.dumps(
                    {
                        "message": "model#checkpoint",
                        "data": {"name": checkpoint["name"], "id": checkpoint["id"]},
                    }
                )
            )

        self.chk = checkpoint
        return checkpoint


def done_processing(modelsrv):
    modelsrv.processing = False


def is_processing(websocket):
    LOGGER.info("not ok  - Can't process message - busy")

    if websocket is not False:
        websocket.error(
            "GPU is Busy",
            "The API is only capable of handling a single processing command at a time. Wait until the retraining/prediction is complete and resubmit",
        )
