import os
import base64
import json
import numpy as np
from .utils import pred2png, geom2px, pxs2geojson, generate_random_points
from .AOI import AOI
from .MemRaster import MemRaster
from .utils import serialize, deserialize
import logging

LOGGER = logging.getLogger("server")


class ModelSrv():
    def __init__(self, model, api):

        self.aoi = None
        self.chk = None
        self.processing = False
        self.api = api
        self.model = model

    def load_checkpoint(self, body, websocket):
        websocket.send(json.dumps({
            'message': 'model#checkpoint#progress',
            'data': {
                'checkpoint': body['id'],
                'processed': 0,
                'total': 1
            }
        }))
        self.chk = self.api.get_checkpoint(body['id'])
        chk_fs = self.api.download_checkpoint(self.chk['id'])
        self.model.load_state_from(self.chk, chk_fs)
        websocket.send(json.dumps({
            'message': 'model#checkpoint#complete',
            'data': {
                'checkpoint': body['id']
            }
        }))

    def prediction(self, body, websocket):
        try:
            if self.processing is True:
                return is_processing(websocket)

            LOGGER.info("ok - starting prediction");

            self.processing = True

            if self.chk is None:
                self.checkpoint({
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

            while len(self.aoi.tiles) > 0:
                zxy = self.aoi.tiles.pop()
                in_memraster = self.api.get_tile(zxy.z, zxy.x, zxy.y)

                output, output_features = self.model.run(in_memraster.data, False)

                # remove 32 pixel buffer on each side
                output = output[32:288, 32:288]
                output_features = output_features[32:288, 32:288, :]

                #TO-DO assert statement for output_features dimensions, and output?

                LOGGER.info("ok - generated inference");

                if self.aoi.live:
                    # Create color versions of predictions
                    png = pred2png(output, color_list) # investigate this

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
                output = np.expand_dims(output, axis=-1)
                output = MemRaster(output, in_memraster.crs, in_memraster.tile, in_memraster.buffered)
                self.aoi.add_to_fabric(output)

            self.aoi.upload_fabric()

            LOGGER.info("ok - done prediction");

            websocket.send(json.dumps({
                'message': 'model#prediction#complete',
                'data': {
                    'aoi': self.aoi.id,
                }
            }))

            self.processing = False
        except Exception as e:
            self.processing = False

            websocket.send(json.dumps({
                'message': 'error',
                'data': {
                    'error': 'processing error',
                    'detailed': str(e)
                }
            }))

            raise e

    def retrain(self, body, websocket):
        try:
            if self.processing is True:
                return is_processing(websocket)

            LOGGER.info("ok - starting retrain");

            self.processing = True

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

            self.checkpoint({
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

            self.processing = False
        except Exception as e:
            self.processing = False

            websocket.send(json.dumps({
                'message': 'error',
                'data': {
                    'error': 'retrain error',
                    'detailed': str(e)
                }
            }))

            raise None

        self.prediction({
            'name': body['name'],
            'polygon': self.aoi.poly
        }, websocket)

    def checkpoint(self, body, websocket):
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

    def load(self, directory):
        return self.model.load_state_from(directory)

def is_processing(websocket):
    LOGGER.info("not ok  - Can't process message - busy");
    websocket.send(json.dumps({
        'message': 'error',
        'data': {
            'error': 'GPU is Busy',
            'detailed': 'The API is only capable of handling a single processing command at a time. Wait until the retraining/prediction is complete and resubmit'
        }
    }))
