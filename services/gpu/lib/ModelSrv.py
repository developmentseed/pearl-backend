import os
import base64
import json
import numpy as np
from .utils import pred2png, geom2px, pxs2geojson
from .AOI import AOI
from .MemRaster import MemRaster
from web_tool.Utils import serialize, deserialize
import logging

LOGGER = logging.getLogger("server")


class ModelSrv():
    def __init__(self, model, api):

        self.aoi = None
        self.chk = None
        self.processing = False
        self.api = api
        self.model = model

    async def load_checkpoint(self, body, websocket):
        self.chk = api.get_checkpoint(body['id'])
        chk_fs = api.download_checkpoint(self.chk['id'])
        self.model.load_state_from(chk, chk_fs)

    async def prediction(self, body, websocket):
        try:
            if self.processing is True:
                return await is_processing(websocket)

            LOGGER.info("ok - starting prediction");

            self.processing = True

            if self.chk is None:
                await self.checkpoint({
                    'name': body['name'],
                    'geoms': [None] * len(self.model.classes)
                }, websocket)

            self.aoi = AOI(self.api, body, self.chk['id'])
            await websocket.send(json.dumps({
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
                    await websocket.send(json.dumps({
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
                    await websocket.send(json.dumps({
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

            await websocket.send(json.dumps({
                'message': 'model#prediction#complete'
            }))

            self.processing = False
        except Exception as e:
            self.processing = False

            await websocket.send(json.dumps({
                'message': 'error',
                'data': {
                    'error': 'processing error',
                    'detailed': str(e)
                }
            }))

            raise e

    async def retrain(self, body, websocket):
        try:
            if self.processing is True:
                return await is_processing(websocket)

            LOGGER.info("ok - starting retrain");

            self.processing = True

            for cls in body['classes']:
                cls['geometry'] = geom2px(cls['geometry'], self)

            self.model.retrain(body['classes'])

            LOGGER.info("ok - done retrain");

            await websocket.send(json.dumps({
                'message': 'model#retrain#complete'
            }))

            await self.checkpoint({
                'name': body['name'],
                'geoms': pxs2geojson([cls["geometry"] for cls in body['classes']]),
                'analytics': [{
                    'counts': cls.get('retraining_counts', 0),
                    'percent': cls.get('retraining_counts_percent', 0),
                    'f1score': cls.get('retraining_f1score', 0)
                } for cls in self.model.classes]
            }, websocket)

            self.processing = False
        except Exception as e:
            self.processing = False

            await websocket.send(json.dumps({
                'message': 'error',
                'data': {
                    'error': 'retrain error',
                    'detailed': str(e)
                }
            }))

            raise None

        await self.prediction({
            'name': body['name'],
            'polygon': self.aoi.poly
        }, websocket)

    async def checkpoint(self, body, websocket):
        classes = []
        for cls in self.model.classes:
            classes.append({
                'name': cls['name'],
                'color': cls['color']
            });

        checkpoint = self.api.create_checkpoint(
            body['name'],
            classes,
            body['geoms'],
            body.get('analytics')
        )
        self.model.save_state_to(self.api.tmp_checkpoints + '/' + str(checkpoint['id']))
        self.api.upload_checkpoint(checkpoint['id'])
        self.api.instance_patch(checkpoint_id = checkpoint['id'])

        await websocket.send(json.dumps({
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

async def is_processing(websocket):
    LOGGER.info("not ok  - Can't process message - busy");
    await websocket.send(json.dumps({
        'message': 'error',
        'data': {
            'error': 'GPU is Busy',
            'detailed': 'The API is only capable of handling a single processing command at a time. Wait until the retraining/prediction is complete and resubmit'
        }
    }))
