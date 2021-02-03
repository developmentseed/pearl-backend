import os
from web_tool.Utils import serialize, deserialize
from .MemRaster import MemRaster
import logging

LOGGER = logging.getLogger("server")


class ModelSrv():
    def __init__(self, model, api):

        os.makedirs("/tmp/checkpoints/", exist_ok=True)
        os.makedirs("/tmp/downloads/", exist_ok=True)
        os.makedirs("/tmp/output/", exist_ok=True)
        os.makedirs("/tmp/session/", exist_ok=True)

        self.api = api
        self.model = model

    def prediction(self, body):
        body.get('polygon')

        memrasters = self.api.get_tile_by_geom(body.get('polygon'), iformat='npy')

        outputs = []
        for in_memraster in memrasters:
            output = self.model.run(in_memraster.data, False)

            assert in_memraster.shape[0] == output.shape[0] and in_memraster.shape[1] == output.shape[1], "ModelSession must return an np.ndarray with the same height and width as the input"

            out_memraster = MemRaster(output, in_memraster.crs, in_memraster.bounds)
            LOGGER.info("ok - generated inference");

            outputs.append(serialize(output))

        LOGGER.info("ok - returning inferences");
        return outputs

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
