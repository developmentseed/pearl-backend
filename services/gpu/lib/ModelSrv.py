import os
import base64
import json
import numpy as np
from .utils import pred2png, geom2px
from .AOI import AOI
from .MemRaster import MemRaster
from web_tool.Utils import serialize, deserialize
import logging

LOGGER = logging.getLogger("server")


class ModelSrv():
    def __init__(self, model, api):

        self.checkpoint_dir = '/tmp/checkpoints/'
        os.makedirs(self.checkpoint_dir, exist_ok=True)

        self.aoi = None
        self.api = api
        self.model = model

    async def prediction(self, body, websocket):
        if self.aoi is not None:
            await websocket.send(json.dumps({
                'message': 'error',
                'data': {
                    'error': 'Previous AOI still processing',
                    'detailed': 'The API is only capable of handling a single AOI at a time. Wait until the AOI is complete and resubmit'
                }
            }))
            return

        chk = await self.checkpoint(body, websocket)
        self.aoi = AOI(self.api, body, chk['id'])

        color_list = [item["color"] for item in self.api.model['classes']]

        for zxy in self.aoi.tiles:
            in_memraster = self.api.get_tile(zxy.z, zxy.x, zxy.y)

            output, output_features = self.model.run(in_memraster.data, False)

            #TO-DO assert statement for output_features dimensions?

            assert in_memraster.shape[0] == output.shape[0] and in_memraster.shape[1] == output.shape[1], "ModelSession must return an np.ndarray with the same height and width as the input"

            LOGGER.info("ok - generated inference");

            if self.aoi.live:
                # if output.shape[2] > len(color_list): # TO-DO fix this check to be in the unique pred values are > color list, or max value predicted > len(color_lst + 1)
                #     LOGGER.warning("The colour list does not match class list")
                #     output = output[:,:,:len(color_list)]

                # Create color versions of predictions
                png = pred2png(output, color_list) # investigate this

                LOGGER.info("ok - returning inference");
                await websocket.send(json.dumps({
                    'message': 'model#prediction',
                    'data': {
                        'bounds': in_memraster.bounds,
                        'image': png,
                        'total': self.aoi.total,
                        'processed': len(self.aoi.tiles)
                    }
                }))
            else:
                await websocket.send(json.dumps({
                    'message': 'model#prediction',
                    'data': {
                        'total': self.aoi.total,
                        'processed': len(self.aoi.tiles)
                    }
                }))

            # Push tile into geotiff fabric
            output = np.expand_dims(output, axis=-1)
            output = MemRaster(output, in_memraster.crs, in_memraster.tile)
            self.aoi.add_to_fabric(output)

        self.aoi.upload_fabric()

        await websocket.send(json.dumps({
            'message': 'model#prediction#complete'
        }))

        self.aoi = None

    async def retrain(self, body, websocket):
        for cls in body['classes']:
            cls['geometry'] = geom2px(cls['geometry'], self.api)

        self.model.retrain(body['classes'])

        await websocket.send(json.dumps({
            'message': 'model#retrain#complete'
        }))

        # TODO Call .prediction to rerun inferences

    def add_sample_point(self, row, col, class_idx):
        return self.model.add_sample_point(row, col, class_idx)

    def undo(self):
        return self.model.undo()

    def reset(self):
        return self.model.reset()

    async def checkpoint(self, body, websocket):
        checkpoint = self.api.create_checkpoint(
            body['name'],
            self.model.classes
        )

        chdir = self.checkpoint_dir + str(checkpoint['id']) + '/'
        os.makedirs(chdir, exist_ok=True)
        self.model.save_state_to(chdir)

        self.api.upload_checkpoint(checkpoint['id'], chdir)

        await websocket.send(json.dumps({
            'message': 'model#checkpoint',
            'data': {
                'name': checkpoint['name'],
                'id': checkpoint['id']
            }
        }))

        return checkpoint

    def load_state_from(self, directory):
        return self.model.load_state_from(directory)
