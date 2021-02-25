import sys
sys.path.append("..")

import os
import time
import copy
import json
import types
import joblib

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

    AUGMENT_MODEL = SGDClassifier(
        loss="log",
        shuffle=True,
        n_jobs=-1,
        learning_rate="constant",
        eta0=0.001,
        warm_start=True
    )


    def __init__(self, gpu_id, model, model_fs):
        self.model_fs = model_fs
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

        # will need to figure out for re-training ?
        self.output_channels = 10 # don't hard code pull from model input
        self.output_features = 64

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
        self.initial_weights = self.model.segmentation_head[0].weight.cpu().detach().numpy().squeeze()
        self.initial_biases = self.model.segmentation_head[0].bias.cpu().detach().numpy()

        self.augment_model = sklearn.base.clone(TorchFineTuning.AUGMENT_MODEL)

        self.augment_model.coef_ = self.initial_weights.astype(np.float64)
        self.augment_model.intercept_ = self.initial_biases.astype(np.float64)
        self.augment_model.classes_ = np.array(list(range(self.output_channels)))
        self.augment_model.n_features_in_ = self.output_features
        self.augment_model.n_features = self.output_features

        self._last_tile = None

        self.augment_x_train = []
        self.augment_y_train = []

    @property
    def last_tile(self):
        return self._last_tile

    def _init_model(self):
        checkpoint = torch.load(self.model_fs, map_location=self.device)
        self.model.load_state_dict(checkpoint)
        self.model.eval()
        self.model = self.model.to(self.device)


    def run(self, tile, inference_mode=False):
        tile = np.moveaxis(tile, -1, 0) #go from channels last to channels first (all MVP pytorch models will want the image tile to be (4, 256, 256))
        tile = tile / 255.0
        tile = tile.astype(np.float32)

        output = self.run_model_on_tile(tile)
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

            self.model.segmentation_head[0].weight = new_weights
            self.model.segmentation_head[0].bias = new_biases

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

        self.augment_model._label_binarizer = label_binarizer # investigate

        return {
            "message": "Model reset successfully",
            "success": True
        }


    def run_model_on_tile(self, tile):
        height = tile.shape[1]
        width = tile.shape[2]

        output = np.zeros((10, height, width), dtype=np.float32) # num_classes hard-coded fix
        counts = np.zeros((height, width), dtype=np.float32)

        tile_img = torch.from_numpy(tile)
        data = tile_img.to(self.device)
        with torch.no_grad():
            t_output = self.model(data[None, ...]) # insert singleton "batch" dimension to input data for pytorch to be happy, to-do fix for actual batches
            t_output = F.softmax(t_output, dim=1).cpu().numpy() #this is giving us the highest probability class per pixel

        output_hard = t_output[0].argmax(axis=0).astype(np.uint8) #using [0] because using a "fake batch" of 1 tile

        return  output_hard

    def save_state_to(self, directory):

        np.save(os.path.join(directory, "augment_x_train.npy"), np.array(self.augment_x_train))
        np.save(os.path.join(directory, "augment_y_train.npy"), np.array(self.augment_y_train))

        joblib.dump(self.augment_model, os.path.join(directory, "augment_model.p")) # how to save sklearn models (used in re-training)

        if self.augment_model_trained:
            with open(os.path.join(directory, "trained.txt"), "w") as f:
                f.write("")

        return {
            "message": "Saved model state",
            "success": True
        }

    def load_state_from(self, directory):

        self.augment_x_train = []
        self.augment_y_train = []

        for sample in np.load(os.path.join(directory, "augment_x_train.npy")):
            self.augment_x_train.append(sample)
        for sample in np.load(os.path.join(directory, "augment_y_train.npy")):
            self.augment_y_train.append(sample)

        self.augment_model = joblib.load(os.path.join(directory, "augment_model.p"))
        self.augment_model_trained = os.path.exists(os.path.join(directory, "trained.txt"))

        return {
            "message": "Loaded model state",
            "success": True
        }
