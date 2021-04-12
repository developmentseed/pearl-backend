import os
import base64
import json
import numpy as np
from .utils import pred2png, geom2px, pxs2geojson, generate_random_points
from .AOI import AOI
from .MemRaster import MemRaster
from .utils import serialize, deserialize
import logging
import rasterio
from rasterio.io import MemoryFile

LOGGER = logging.getLogger("server")


class ModelSrv():
    def __init__(self, model, api):

        self.is_aborting = False
        self.aoi = None
        self.chk = None
        self.processing = False
        self.api = api
        self.model = model

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
                patch = AOI(self.api, body, self.chk['id'], is_patch=self.aoi.id)

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
                    in_memraster = MemRaster(
                        np.ones([256,256]) * body['class'],
                        "epsg:3857",
                        (zxy.x, zxy.y, zxy.z)
                    )

                    output.clip(self.aoi.poly)

                    if patch.live:
                        # Create color versions of predictions
                        png = pred2png(output.data, color_list)

                        LOGGER.info("ok - returning patch inference");
                        websocket.send(json.dumps({
                            'message': 'model#patch#progress',
                            'data': {
                                'patch': patch.id,
                                'bounds': in_memraster.bounds,
                                'x': in_memraster.x, 'y': in_memraster.y, 'z': in_memraster.z,
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
                    output = np.expand_dims(output, axis=-1)
                    output = MemRaster(output, in_memraster.crs, in_memraster.tile, in_memraster.buffered)
                    patch.add_to_fabric(output)

                if self.is_aborting is True:
                    websocket.send(json.dumps({
                        'message': 'model#aborted',
                    }))
                else:
                    patch.upload_fabric()

                    LOGGER.info("ok - done patch prediction");

                self.meta_load_checkpoint(current_checkpoint)

            elif body.get('type') == 'brush':
                current_checkpoint = self.chk['id']
                self.meta_load_checkpoint(body['checkpoint_id'])

                patch = AOI(self.api, body, self.chk['id'], is_patch=self.aoi.id)
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
                    in_memraster = self.api.get_tile(zxy.z, zxy.x, zxy.y)
                    output, _ = self.model.run(in_memraster.data, False)

                    # remove 32 pixel buffer on each side
                    output = output.remove_buffer()
                    output.clip(self.aoi.poly)

                    if patch.live:
                        # Create color versions of predictions
                        png = pred2png(output.data, color_list)

                        LOGGER.info("ok - returning patch inference");
                        websocket.send(json.dumps({
                            'message': 'model#patch#progress',
                            'data': {
                                'patch': patch.id,
                                'bounds': in_memraster.bounds,
                                'x': in_memraster.x, 'y': in_memraster.y, 'z': in_memraster.z,
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
                    output = np.expand_dims(output, axis=-1)
                    output = MemRaster(output, in_memraster.crs, in_memraster.tile, in_memraster.buffered)
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

            self.aoi = AOI(self.api, body, self.chk['id'])
            websocket.send(json.dumps({
                'message': 'model#aoi',
                'data': {
                    'id': self.aoi.id,
                    'name': self.aoi.name,
                    'checkpoint_id': self.chk['id'],
                    'bounds': self.aoi.bounds,
                    'total': self.aoi.total
                }
            }))

            color_list = [item["color"] for item in self.model.classes]

            while len(self.aoi.tiles) > 0 and self.is_aborting is False:
                zxy = self.aoi.tiles.pop()
                in_memraster = self.api.get_tile(zxy.z, zxy.x, zxy.y)

                output, _ = self.model.run(in_memraster.data, False)

                output = MemRaster(
                        output,
                        "epsg:3857",
                        (in_memraster.x, in_memraster.y, in_memraster.z),
                        True)

                output = output.remove_buffer()

                #clip output
                output.clip(self.aoi.poly)
                LOGGER.info("ok - generated inference");

                if self.aoi.live:
                    # Create color versions of predictions
                    png = pred2png(output.data, color_list) # investigate this

                    LOGGER.info("ok - returning inference");
                    websocket.send(json.dumps({
                        'message': 'model#prediction',
                        'data': {
                            'aoi': self.aoi.id,
                            'bounds': in_memraster.bounds,
                            'x': in_memraster.x, 'y': in_memraster.y, 'z': in_memraster.z,
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
                output = np.expand_dims(output.data, axis=-1)
                output = MemRaster(output, in_memraster.crs, in_memraster.tile, in_memraster.buffered)
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

            done_processing(self)
            if self.aoi is not None:
                self.prediction({
                    'name': body['name'],
                    'polygon': self.aoi.poly
                }, websocket)

        except Exception as e:
            done_processing(self)
            websocket.error('Retrain Error', e)
            raise e

    def meta_load_checkpoint(self, load_id):
        self.chk = self.api.get_checkpoint(load_id)
        chk_fs = self.api.download_checkpoint(self.chk['id'])
        self.model.load_state_from(self.chk, chk_fs)

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
