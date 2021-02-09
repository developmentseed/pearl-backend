import os
import base64
import json
import numpy as np
import cv2
from .AOI import AOI
from web_tool.Utils import serialize, deserialize, class_prediction_to_img
from .MemRaster import MemRaster
import logging

LOGGER = logging.getLogger("server")


class ModelSrv():
    def __init__(self, model, api):

        os.makedirs("/tmp/checkpoints/", exist_ok=True)
        os.makedirs("/tmp/downloads/", exist_ok=True)
        os.makedirs("/tmp/output/", exist_ok=True)
        os.makedirs("/tmp/session/", exist_ok=True)

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

        self.aoi = AOI(self.api, body.get('polygon'))

        color_list = [item["color"] for item in self.api.model['classes']]

        for in_memraster in self.aoi.memrasters:
            output = self.model.run(in_memraster.data, False)

            assert in_memraster.shape[0] == output.shape[0] and in_memraster.shape[1] == output.shape[1], "ModelSession must return an np.ndarray with the same height and width as the input"

            LOGGER.info("ok - generated inference");

            if output.shape[2] > len(color_list):
                LOGGER.warning("The number of output channels is larger than the given color list, cropping output to number of colors (you probably don't want this to happen")
                output = output[:,:,:len(color_list)]

            # Create color versions of predictions
            img_soft = class_prediction_to_img(output, False, color_list)
            img_soft = cv2.imencode(".png", cv2.cvtColor(img_soft, cv2.COLOR_RGB2BGR))[1].tostring()
            img_soft = base64.b64encode(img_soft).decode("utf-8")

            await websocket.send(json.dumps({
                'message': 'model#prediction#progress',
                'data': {
                    'total': self.aoi.total,
                    'processed': len(self.aoi.tiles)
                }
            }))

            if self.aoi.live:
                LOGGER.info("ok - returning inference");
                await websocket.send(json.dumps({
                    'message': 'model#prediction',
                    'data': {
                        'bounds': in_memraster.bounds,
                        'image': img_soft
                    }
                }))

        await websocket.send(json.dumps({
            'message': 'model#prediction#complete'
        }))

        self.aoi = None

    def last_tile(self):
        return serialize(self.model.last_tile)

    def retrain(self):
        return self.model.retrain()

    def add_sample_point(self, row, col, class_idx):
        return self.model.add_sample_point(row, col, class_idx)

    def undo(self):
        return self.model.undo()

    def reset(self):
        return self.model.reset()

    def save_state_to(self, directory):
        return self.model.save_state_to(directory)

    def load_state_from(self, directory):
        return self.model.load_state_from(directory)
