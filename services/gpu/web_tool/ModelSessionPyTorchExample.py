import sys
sys.path.append("..")

import os
import time
import copy
import json
import types

import logging
LOGGER = logging.getLogger("server")

import numpy as np

import sklearn.base
from sklearn.linear_model import SGDClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import LabelBinarizer

from .ModelSessionAbstract import ModelSession
from training.models.unet_solar import UnetModel
import segmentation_models_pytorch as smp

import torch
import torch.nn as nn
import torch.nn.functional as F


class TorchFineTuning(ModelSession):

    AUGMENT_MODEL = MLPClassifier(
        hidden_layer_sizes=(),
        alpha=0.0001,
        solver='lbfgs',
        tol=0.0001,
        verbose=False,
        validation_fraction=0.0,
        n_iter_no_change=50
    )


    def __init__(self, gpu_id, model, model_fs):
        self.model_fs = model_fs
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

        # will need to figure out for re-training ?
        # self.output_channels = 10
        # self.output_features = 64

        # self.down_weight_padding = 10

        # self.stride_x = self.input_size - self.down_weight_padding*2
        # self.stride_y = self.input_size - self.down_weight_padding*2

        ### TODO
        self.model = smp.Unet(
            encoder_name='resnet18', encoder_depth=3, encoder_weights=None,
            decoder_channels=(128, 64, 64), in_channels=4, classes=10 #this is hard-ocded need to fix
            )
        self._init_model()

        for param in self.model.parameters():
           param.requires_grad = False

        # will need to figure out for re-training
        #self.initial_weights = self.model.seg_layer.weight.cpu().detach().numpy().squeeze()
        #self.initial_biases = self.model.seg_layer.bias.cpu().detach().numpy()

        # self.augment_model = sklearn.base.clone(TorchFineTuning.AUGMENT_MODEL)

        self._last_tile = None

        self.augment_x_train = []
        self.augment_y_train = []

    @property
    def last_tile(self):
        return self._last_tile

    def _init_model(self):
        checkpoint = torch.load(self.model_fs, map_location=self.device)
        self.model.load_state_dict(checkpoint)
        #self.model.eval()
        #self.model.seg_layer = nn.Conv2d(64, 10, kernel_size=1)
        self.model = self.model.to(self.device)


    def run(self, tile, inference_mode=False):
        print ('in run tile')

        tile = np.moveaxis(tile, -1, 0) #go from channels last to channels first (all MVP pytorch models will want the image tile to be (4, 256, 256))
        tile = tile / 255.0
        tile = tile.astype(np.float32)
        print(tile.shape)

        output  = self.run_model_on_tile(tile)
        #self._last_tile = output_features

        return output

    def retrain(self, **kwargs):
        x_train = np.array(self.augment_x_train)
        y_train = np.array(self.augment_y_train)

        if x_train.shape[0] == 0:
            return {
                "message": "Need to add training samples in order to train",
                "success": False
            }


        try:
            self.augment_model.fit(x_train, y_train)
            score = self.augment_model.score(x_train, y_train)
            LOGGER.debug("Fine-tuning accuracy: %0.4f" % (score))

            new_weights = torch.from_numpy(self.augment_model.coefs_[0].T.copy().astype(np.float32)[:,:,np.newaxis,np.newaxis])
            new_biases = torch.from_numpy(self.augment_model.intercepts_[0].astype(np.float32))
            new_weights = new_weights.to(self.device)
            new_biases = new_biases.to(self.device)

            self.model.seg_layer.weight.data = new_weights
            self.model.seg_layer.bias.data = new_biases

            return {
                "message": "Fine-tuning accuracy on data: %0.2f" % (score),
                "success": True
            }
        except Exception as e:
            return {
                "message": "Error in 'retrain()': %s" % (e),
                "success": False
            }

    def undo(self):
        if len(self.augment_y_train) > 0:
            self.augment_x_train.pop()
            self.augment_y_train.pop()
            return {
                "message": "Undid training sample",
                "success": True
            }
        else:
            return {
                "message": "Nothing to undo",
                "success": False
            }

    def add_sample_point(self, row, col, class_idx):
        if self._last_tile is not None:
            self.augment_x_train.append(self._last_tile[row, col, :].copy())
            self.augment_y_train.append(class_idx)
            return {
                "message": "Training sample for class %d added" % (class_idx),
                "success": True
            }
        else:
            return {
                "message": "Must run model before adding a training sample",
                "success": False
            }

    def reset(self):
        self._init_model()
        self.augment_x_train = []
        self.augment_y_train = []
        self.augment_model = sklearn.base.clone(TorchFineTuning.AUGMENT_MODEL)

        label_binarizer = LabelBinarizer()
        label_binarizer.fit(range(self.output_channels))

        self.augment_model.coefs_ = [self.initial_weights]
        self.augment_model.intercepts_ = [self.initial_biases]

        self.augment_model.classes_ = np.array(list(range(self.output_channels)))
        self.augment_model.n_features_in_ = self.output_features
        self.augment_model.n_outputs_ = self.output_channels
        self.augment_model.n_layers_ = 2
        self.augment_model.out_activation_ = 'softmax'

        self.augment_model._label_binarizer = label_binarizer

        return {
            "message": "Model reset successfully",
            "success": True
        }


    def run_model_on_tile(self, tile):
        print('in run model on tile')
        height = tile.shape[0]
        width = tile.shape[1]

        #print (self.model)

        self.model.eval() #moved this out of the _init_model() should probably move back?

        output = np.zeros((10, height, width), dtype=np.float32) # num_classes hard-coded fix
        counts = np.zeros((height, width), dtype=np.float32)

        tile_img = torch.from_numpy(tile)
        data = tile_img.to(self.device)
        with torch.no_grad():
            t_output = self.model(data[None, ...]) # insert singleton "batch" dimension to input data for pytorch to be happy, to-do fix for actual batches
            t_output = F.softmax(t_output, dim=1).cpu().numpy()

        print(t_output.shape)
        output_hard = t_output[0].argmax(axis=0).astype(np.uint8) #using [0] because using a "fake batch" of 1 tile

        print ('output_hard shape')
        print (output_hard.shape)
        print(np.unique(output_hard))

        # just one tile at a time? or can we get batches of tiles?
        # batch = []
        # batch_indices = []
        # batch_count = 0

        # we don't need this part because this is helping to make 256, 256 tiles from a large naip image, but the new naip tiler returns 256 by 256 already
        # for y_index in (list(range(0, height - self.input_size, self.stride_y)) + [height - self.input_size,]):
        #     for x_index in (list(range(0, width - self.input_size, self.stride_x)) + [width - self.input_size,]):
        #         naip_im = tile[y_index: y_index + self.input_size, x_index: x_index + self.input_size, :]
        #         print(naip_im)

        #         batch.append(naip_im)
        #         batch_indices.append((y_index, x_index))
        #         batch_count+=1
        #batch = np.array(batch)
        #rint(batch.shape)

        # model_output = []
        # model_feature_output = []
        # for i in range(0, len(batch), batch_size):

        #     t_batch = batch[i:i+batch_size]
        #     t_batch = np.rollaxis(t_batch, 3, 1)
        #     print(t_batch.shape)
        #     t_batch = torch.from_numpy(t_batch).to(self.device)

        #     with torch.no_grad():
        #         predictions, features = self.model.forward(t_batch)
        #         predictions = F.softmax(predictions)

        #         predictions = predictions.cpu().numpy()
        #         features = features.cpu().numpy()

        #     predictions = np.rollaxis(predictions, 1, 4)
        #     features = np.rollaxis(features, 1, 4)

        #     model_output.append(predictions)
        #     model_feature_output.append(features)

        # model_output = np.concatenate(model_output, axis=0)
        # model_feature_output = np.concatenate(model_feature_output, axis=0)

        # for i, (y, x) in enumerate(batch_indices):
        #     output[y:y+self.input_size, x:x+self.input_size] += model_output[i] * kernel[..., np.newaxis]
        #     output_features[y:y+self.input_size, x:x+self.input_size] += model_feature_output[i] * kernel[..., np.newaxis]
        #     counts[y:y+self.input_size, x:x+self.input_size] += kernel

        #output = output / counts[..., np.newaxis]
        #output_features = output_features / counts[..., np.newaxis]

        return  output_hard

    def save_state_to(self, directory):
        raise NotImplementedError()
        # np.save(os.path.join(directory, "augment_x_train.npy"), np.array(self.augment_x_train))
        # np.save(os.path.join(directory, "augment_y_train.npy"), np.array(self.augment_y_train))

        # joblib.dump(self.augment_model, os.path.join(directory, "augment_model.p"))

        # if self.augment_model_trained:
        #     with open(os.path.join(directory, "trained.txt"), "w") as f:
        #         f.write("")

        return {
            "message": "Saved model state",
            "success": True
        }

    def load_state_from(self, directory):
        raise NotImplementedError()
        # self.augment_x_train = []
        # self.augment_y_train = []

        # for sample in np.load(os.path.join(directory, "augment_x_train.npy")):
        #     self.augment_x_train.append(sample)
        # for sample in np.load(os.path.join(directory, "augment_y_train.npy")):
        #     self.augment_y_train.append(sample)

        # self.augment_model = joblib.load(os.path.join(directory, "augment_model.p"))
        # self.augment_model_trained = os.path.exists(os.path.join(directory, "trained.txt"))

        return {
            "message": "Loaded model state",
            "success": True
        }