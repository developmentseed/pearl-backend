from web_tool.Utils import serialize, deserialize

class Model():
    def __init__(self, model):
        self.model = model

    def last_tile(self):
        return serialize(self.model.last_tile)

    def run(self, tile, inference_mode=False):
        tile = deserialize(tile) # need to serialize/deserialize numpy arrays
        output = self.model.run(tile, inference_mode)
        return serialize(output) # need to serialize/deserialize numpy arrays

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

