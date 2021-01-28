import os
from web_tool.Utils import serialize, deserialize


class ModelSrv():
    def __init__(self, api, model):

        os.makedirs("/tmp/checkpoints/", exist_ok=True)
        os.makedirs("/tmp/downloads/", exist_ok=True)
        os.makedirs("/tmp/output/", exist_ok=True)
        os.makedirs("/tmp/session/", exist_ok=True)

        self.api = api
        self.model = model

    def prediction(self, body):
        body.get('polygon')

        tiles = api.get_tile_by_geom(body.get('polygon'))

        output = self.model.run(input_raster.data, True)
        assert input_raster.shape[0] == output.shape[0] and input_raster.shape[1] == output.shape[1], "ModelSession must return an np.ndarray with the same height and width as the input"

        output = InMemoryRaster(output, input_raster.crs, input_raster.transform, input_raster.bounds)

        return serialize(output)

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
