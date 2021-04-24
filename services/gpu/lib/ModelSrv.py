import os
import base64
import json
import numpy as np
import torch

from .utils import pred2png, geom2px, pxs2geojson, generate_random_points
from .AOI import AOI
from .MemRaster import MemRaster
from .utils import serialize, deserialize
import logging
import rasterio
from rasterio.io import MemoryFile
from shapely.geometry import box, mapping
from .InferenceDataSet import InferenceDataSet

LOGGER = logging.getLogger("server")


class ModelSrv():
    def __init__(self, model, api):

        self.is_aborting = False
        self.aoi = None
        self.chk = None
        self.processing = False
        self.api = api
        self.model = model

        if api.instance.get('checkpoint_id') is not None:
            self.meta_load_checkpoint(self.api.instance.get('checkpoint_id'))

        if api.instance.get('aoi_id') is not None:
            self.aoi = AOI.load(self.api, self.api.instance.get('aoi_id'))

    def abort(self, body, websocket):
        if self.processing is False:
            websocket.error('Nothing to abort', 'The GPU is not currently processing and has nothing to abort')
        else:
            self.is_aborting = True

    def status(self, body, websocket):
        try:
            payload = {
                'is_aborting': self.is_aborting,
                'processing': self.processing,
                'aoi': False,
                'checkpoint': False
            }

            if self.aoi is not None:
                payload['aoi'] = self.aoi.id,

            if self.chk is not None:
                payload['checkpoint'] = self.chk['id']

            websocket.send(json.dumps({
                'message': 'model#status',
                'data': payload
            }))

        except Exception as e:
            websocket.error('Model Status Error', e)
            raise e

    def patch(self, body, websocket):
        try:
            if self.processing is True:
                return is_processing(websocket)

            self.processing = True

            if self.aoi is None:
                websocket.error('Cannot Patch as no AOI is loaded')
                done_processing(self)
                return;
            elif self.chk is None:
                websocket.error('Cannot Patch as no Checkpoint is loaded')
                done_processing(self)
                return;

            if body.get('type') == 'class':
                patch = AOI.create(self.api, body.get('polygon'), body.get('name', ''), self.chk['id'], is_patch=self.aoi.id)

                websocket.send(json.dumps({
                    'message': 'model#patch',
                    'data': {
                        'id': patch.id,
                        'checkpoint_id': self.chk['id'],
                        'bounds': patch.bounds,
                        'total': patch.total
                    }
                }))

                color_list = [item["color"] for item in self.model.classes]

                while len(patch.tiles) > 0 and self.is_aborting is False:
                    zxy = patch.tiles.pop()
                    output = MemRaster(
                        np.ones([256,256], dtype=np.uint8) * body['class'],
                        "epsg:3857",
                        (zxy.x, zxy.y, zxy.z)
                    )

                    output.clip(patch.poly)

                    if patch.live:
                        # Create color versions of predictions
                        png = pred2png(output.data, color_list)

                        LOGGER.info("ok - returning patch inference");
                        websocket.send(json.dumps({
                            'message': 'model#patch#progress',
                            'data': {
                                'patch': patch.id,
                                'bounds': output.bounds,
                                'x': output.x, 'y': output.y, 'z': output.z,
                                'image': png,
                                'total': patch.total,
                                'processed': patch.total - len(patch.tiles)
                            }
                        }))
                    else:
                        websocket.send(json.dumps({
                            'message': 'model#patch#progress',
                            'data': {
                                'patch': patch.id,
                                'total': patch.total,
                                'processed': len(patch.tiles)
                            }
                        }))

                    # Push tile into geotiff fabric
                    output = MemRaster(np.expand_dims(output.data, axis=-1), output.crs, output.tile, output.buffered)
                    patch.add_to_fabric(output)

                if self.is_aborting is True:
                    websocket.send(json.dumps({
                        'message': 'model#aborted',
                    }))
                else:
                    patch.upload_fabric()

                    LOGGER.info("ok - done patch prediction");
            elif body.get('type') == 'brush':
                current_checkpoint = self.chk['id']
                self.meta_load_checkpoint(body['checkpoint_id'])

                patch = AOI.create(self.api, body.get('polygon'), body.get('name', ''), self.chk['id'], is_patch=self.aoi.id)
                websocket.send(json.dumps({
                    'message': 'model#patch',
                    'data': {
                        'id': patch.id,
                        'live': patch.live,
                        'checkpoint_id': self.chk['id'],
                        'bounds': patch.bounds,
                        'total': patch.total
                    }
                }))

                color_list = [item["color"] for item in self.model.classes]

                while len(patch.tiles) > 0 and self.is_aborting is False:
                    zxy = patch.tiles.pop()
                    in_memraster = self.api.get_tile(zxy.z, zxy.x, zxy.y)
                    output = self.model.run(in_memraster.data, True)

                    output = MemRaster(output, in_memraster.crs, in_memraster.tile, in_memraster.buffered)
                    output = output.remove_buffer()
                    output = output.clip(patch.poly)

                    if patch.live:
                        # Create color versions of predictions
                        png = pred2png(output.data, color_list)

                        LOGGER.info("ok - returning patch inference");
                        websocket.send(json.dumps({
                            'message': 'model#patch#progress',
                            'data': {
                                'patch': patch.id,
                                'bounds': output.bounds,
                                'x': output.x, 'y': output.y, 'z': output.z,
                                'image': png,
                                'total': patch.total,
                                'processed': patch.total - len(patch.tiles)
                            }
                        }))
                    else:
                        websocket.send(json.dumps({
                            'message': 'model#patch#progress',
                            'data': {
                                'patch': patch.id,
                                'total': patch.total,
                                'processed': len(patch.tiles)
                            }
                        }))

                    # Push tile into geotiff fabric
                    output = MemRaster(np.expand_dims(output.data, axis=-1), output.crs, output.tile, output.buffered)
                    patch.add_to_fabric(output)

                if self.is_aborting is True:
                    websocket.send(json.dumps({
                        'message': 'model#aborted',
                    }))
                else:
                    patch.upload_fabric()

                    LOGGER.info("ok - done patch prediction");

                self.meta_load_checkpoint(current_checkpoint)

            websocket.send(json.dumps({
                'message': 'model#patch#complete',
                'data': {
                    'patch': patch.id,
                }
            }))

            done_processing(self)
        except Exception as e:
            done_processing(self)
            websocket.error('AOI Patch Error', e)
            raise e

    def load_aoi(self, body, websocket):
        try:
            if self.processing is True:
                return is_processing(websocket)

            self.processing = True

            websocket.send(json.dumps({
                'message': 'model#aoi#progress',
                'data': {
                    'aoi': body['id'],
                    'processed': 0,
                    'total': 1
                }
            }))

            self.aoi = AOI.load(self.api, body['id'])
            self.meta_load_checkpoint(self.aoi.checkpointid)

            websocket.send(json.dumps({
                'message': 'model#aoi#complete',
                'data': {
                    'aoi': self.aoi.id
                }
            }))

            done_processing(self)

        except Exception as e:
            done_processing(self)
            websocket.error('AOI Load Error', e)
            raise e

    def load_checkpoint(self, body, websocket):
        try:
            if self.processing is True:
                return is_processing(websocket)

            self.processing = True

            websocket.send(json.dumps({
                'message': 'model#checkpoint#progress',
                'data': {
                    'checkpoint': body['id'],
                    'processed': 0,
                    'total': 1
                }
            }))

            self.meta_load_checkpoint(body['id'])

            websocket.send(json.dumps({
                'message': 'model#checkpoint#complete',
                'data': {
                    'checkpoint': body['id']
                }
            }))

            done_processing(self)

        except Exception as e:
            done_processing(self)
            websocket.error('Checkpoint Load Error', e)
            raise e

    def prediction(self, body, websocket):
        try:
            if self.processing is True:
                return is_processing(websocket)

            LOGGER.info("ok - starting prediction");

            self.processing = True

            if self.chk is None:
                self.meta_save_checkpoint({
                    'name': body['name'],
                    'geoms': [None] * len(self.model.classes),
                    'analytics': [{
                        'counts': cls.get('counts', 0),
                        'percent': cls.get('percent', 0),
                        'f1score': cls.get('retraining_f1score', 0)
                    } for cls in self.model.classes]
                }, websocket)

            self.aoi = AOI.create(self.api, body.get('polygon'), body.get('name'), self.chk['id'])
            websocket.send(json.dumps({
                'message': 'model#aoi',
                'data': {
                    'id': self.aoi.id,
                    'live': self.aoi.live,
                    'name': self.aoi.name,
                    'checkpoint_id': self.chk['id'],
                    'bounds': self.aoi.bounds,
                    'total': self.aoi.total
                }
            }))

            color_list = [item["color"] for item in self.model.classes]

            dataset = InferenceDataSet(self.api, self.aoi.tiles)
            dataloader = torch.utils.data.DataLoader(
                dataset,
                batch_size=32,
                num_workers=4,
                pin_memory=True,
            )

            while len(self.aoi.tiles) > 0 and self.is_aborting is False:
                for i, (data, xyz) in enumerate(dataloader):
                    xyz = xyz.numpy()
                    outputs = self.model.run(data, True)


                    for c, output in enumerate(outputs):
                        print(c)
                        print(type(output))
                        print(output.shape)
                        print(xyz[c])
                        output = MemRaster(
                            output,
                            "epsg:3857",
                            tuple(xyz[c]),
                            True
                        )

                        output = output.remove_buffer()

                        #clip output
                        output.clip(self.aoi.poly)
                        LOGGER.info("ok - generated inference");

                        if self.aoi.live:
                            # Create color versions of predictions
                            print(output.data.shape)
                            print(np.unique(output.data))
                            print(color_list)
                            png = pred2png(output.data, color_list)

                            LOGGER.info("ok - returning inference")

                            websocket.send(json.dumps({
                                'message': 'model#prediction',
                                'data': {
                                    'aoi': self.aoi.id,
                                    'bounds': output.bounds,
                                    'x': output.x.item(), 'y': output.y.item(), 'z': output.z.item(), # Convert from int64 to int
                                    'image': png,
                                    'total': self.aoi.total,
                                    'processed': self.aoi.total - len(self.aoi.tiles)
                                }
                            }))
                        else:
                            websocket.send(json.dumps({
                                'message': 'model#prediction',
                                'data': {
                                    'aoi': self.aoi.id,
                                    'total': self.aoi.total,
                                    'processed': len(self.aoi.tiles)
                                }
                            }))

                        # Push tile into geotiff fabric
                        output = MemRaster(np.expand_dims(output.data, axis=-1), output.crs, output.tile, output.buffered)
                        self.aoi.add_to_fabric(output)


            if self.is_aborting is True:
                websocket.send(json.dumps({
                    'message': 'model#aborted',
                }))
            else:
                self.aoi.upload_fabric()

                LOGGER.info("ok - done prediction");

                websocket.send(json.dumps({
                    'message': 'model#prediction#complete',
                    'data': {
                        'aoi': self.aoi.id,
                    }
                }))

            done_processing(self)
        except Exception as e:
            done_processing(self)
            websocket.error('Processing Error', e)
            raise e

    def retrain(self, body, websocket):
        try:
            if self.processing is True:
                return is_processing(websocket)
            self.processing = True

            LOGGER.info("ok - starting retrain");

            for cls in body['classes']:
                for feature in cls['geometry']['geometries']:
                    cls['retrain_geometry'] = []
                    if feature['type'] == 'Polygon':
                        points = generate_random_points(100, feature, self)
                        cls['retrain_geometry'] = cls['retrain_geometry'] + points

                    if feature['type'] == 'MultiPoint':
                        cls['retrain_geometry'] = cls['retrain_geometry'] + geom2px(feature, self)

            self.model.retrain(body['classes'])

            LOGGER.info("ok - done retrain");

            websocket.send(json.dumps({
                'message': 'model#retrain#complete'
            }))

            self.meta_save_checkpoint({
                'name': body['name'],
                'parent': self.chk['id'],
                'input_geoms': [cls["geometry"] for cls in body['classes']],
                'retrain_geoms': pxs2geojson([cls["retrain_geometry"] for cls in body['classes']]),
                'analytics': [{
                    'counts': cls.get('counts', 0),
                    'percent': cls.get('percent', 0),
                    'f1score': cls.get('retraining_f1score', 0)
                } for cls in self.model.classes]
            }, websocket)

            if self.is_aborting is True:
                websocket.send(json.dumps({
                    'message': 'model#aborted',
                }))

                done_processing(self)
            else:
                done_processing(self)

                if self.aoi is not None:
                    self.prediction({
                        'name': body['name'],
                        'polygon': mapping(self.aoi.poly)
                    }, websocket)

        except Exception as e:
            done_processing(self)
            websocket.error('Retrain Error', e)
            raise e

    def meta_load_checkpoint(self, load_id):
        self.chk = self.api.get_checkpoint(load_id)
        chk_fs = self.api.download_checkpoint(self.chk['id'])
        self.model.load_state_from(self.chk, chk_fs)
        self.api.instance_patch(checkpoint_id = self.chk['id'])

    def meta_load_aoi(self, load_id):
        self.chk = self.api.get_checkpoint(load_id)
        chk_fs = self.api.download_checkpoint(self.chk['id'])
        self.model.load_state_from(self.chk, chk_fs)
        self.api.instance_patch(checkpoint_id = self.chk['id'])

    def meta_save_checkpoint(self, body, websocket):
        classes = []
        for cls in self.model.classes:
            classes.append({
                'name': cls['name'],
                'color': cls['color']
            });

        checkpoint = self.api.create_checkpoint(
            body['name'],
            body.get('parent'),
            classes,
            body.get('retrain_geoms'),
            body.get('input_geoms'),
            body.get('analytics')
        )
        self.model.save_state_to(self.api.tmp_checkpoints + '/' + str(checkpoint['id']))
        self.api.upload_checkpoint(checkpoint['id'])
        self.api.instance_patch(checkpoint_id = checkpoint['id'])

        websocket.send(json.dumps({
            'message': 'model#checkpoint',
            'data': {
                'name': checkpoint['name'],
                'id': checkpoint['id']
            }
        }))

        self.chk = checkpoint
        return checkpoint

def done_processing(modelsrv):
    modelsrv.processing = False
    modelsrv.is_aborting = False

def is_processing(websocket):
    LOGGER.info("not ok  - Can't process message - busy");
    websocket.error('GPU is Busy', 'The API is only capable of handling a single processing command at a time. Wait until the retraining/prediction is complete and resubmit')
