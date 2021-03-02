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
from sklearn.model_selection import train_test_split

from .ModelSessionAbstract import ModelSession

import torch
import torch.nn as nn
import torch.nn.functional as F

class FCN(nn.Module):

    def __init__(self, num_input_channels, num_output_classes, num_filters=64):
        super(FCN,self).__init__()

        self.conv1 = nn.Conv2d(num_input_channels, num_filters, kernel_size=3, stride=1, padding=1)
        self.conv2 = nn.Conv2d(num_filters, num_filters,        kernel_size=3, stride=1, padding=1)
        self.conv3 = nn.Conv2d(num_filters, num_filters,        kernel_size=3, stride=1, padding=1)
        self.conv4 = nn.Conv2d(num_filters, num_filters,        kernel_size=3, stride=1, padding=1)
        self.conv5 = nn.Conv2d(num_filters, num_filters,        kernel_size=3, stride=1, padding=1)
        self.last =  nn.Conv2d(num_filters, num_output_classes, kernel_size=1, stride=1, padding=0)

    def forward(self,inputs):
        x = F.relu(self.conv1(inputs))
        x = F.relu(self.conv2(x))
        x = F.relu(self.conv3(x))
        x = F.relu(self.conv4(x))
        x = F.relu(self.conv5(x))
        x = self.last(x)
        return x

class TorchFineTuning(ModelSession):

    AUGMENT_MODEL = SGDClassifier(
        loss="log",
        shuffle=True,
        n_jobs=-1,
        learning_rate="constant",
        eta0=0.001,
        warm_start=True,
        verbose=True
    )


    def __init__(self, gpu_id, api):
        print(len(api.model['classes'])) # Num Classes
        print(api.model['classes']) # Classses themselves


        self.model_fs = api.model_fs
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")

        # will need to figure out for re-training ?
        self.output_channels = 10 # don't hard code pull from model input
        self.output_features = 64

        # self.down_weight_padding = 10

        # self.stride_x = self.input_size - self.down_weight_padding*2
        # self.stride_y = self.input_size - self.down_weight_padding*2

        ### TODO
        self.model = FCN(num_input_channels=4, num_output_classes=10, num_filters=64) #to-do fix that 10 is hardcoded
        self._init_model()

        for param in self.model.parameters():
           param.requires_grad = False

        # will need to figure out for re-training
        self.initial_weights = self.model.last.weight[0].cpu().detach().numpy().squeeze()
        self.initial_biases = self.model.last.bias.cpu().detach().numpy()

        self.augment_model = sklearn.base.clone(TorchFineTuning.AUGMENT_MODEL)

        self.augment_model.coef_ = self.initial_weights.astype(np.float64)
        self.augment_model.intercept_ = self.initial_biases.astype(np.float64)
        self.augment_model.classes_ = np.array(list(range(self.output_channels)))
        self.augment_model.n_features_in_ = self.output_features
        self.augment_model.n_features = self.output_features

        self._last_tile = None

        self.augment_x_train = []
        self.augment_y_train = []

        self.class_names_mapping = {'No Data': 0, 'Water': 1, 'Emergent Wetlands': 2, 'Tree Canopy': 3, 'Shrubland': 4, 'Low Vegetation': 5, 'Barren': 6, 'Structure': 7, 'Impervious Surface': 8,
                                    'Impervious Road': 9} #TO-DO this should not be hard-coded

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

    def retrain(self, classes, **kwargs):
        pixels = [x['geometry'] for x in classes]
        counts = [len(x) for x in pixels]
        self.augment_x_train = [item.value / 255. for sublist in pixels for item in sublist]  # get pixel values and scale
        names =  [x['name'] for x in classes]

        names_retrain = []
        for i, c in enumerate(counts):
             names_retrain.append(list(np.repeat(names[i], c)))

        names_retrain = [x for sublist in names_retrain for x in sublist]

        ints_retrain = []
        for name in names_retrain:
            if name not in list(self.class_names_mapping.keys()):
                self.class_names_mapping.update({name: max(self.class_names_mapping.values()) + 1}) #to-do? this new classs name + value need to stay in the dictionary for future re-training iterations
            ints_retrain.append(self.class_names_mapping.get(name))

        self.augment_y_train =  ints_retrain #to-do map these to integers, fix the number of labels to correspond with the number of points
        x_train = np.array(self.augment_x_train)
        y_train = np.array(self.augment_y_train)

        print(x_train.shape)
        print(y_train.shape)

        print (x_train)
        print(y_train)

        if x_train.shape[0] == 0:
            return {
                "message": "Need to add training samples in order to train",
                "success": False
            }

        # split re-training data into test 20% and train 80%
        x_train, x_test, y_train, y_test = train_test_split(
                                            x_train, y_train, test_size=0.2, random_state=0)

        print (x_train.shape)
        print (x_test.shape)
        print (y_train.shape)
        print(y_test.shape)


        try:
            self.augment_model.fit(x_train, y_train) #figure out if this is running on GPU or CPU
            score = self.augment_model.score(x_test, y_test)
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

        # if self.augment_model_trained:
        #     with open(os.path.join(directory, "trained.txt"), "w") as f:
        #         f.write("")

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
        #self.augment_model_trained = os.path.exists(os.path.join(directory, "trained.txt"))

        return {
            "message": "Loaded model state",
            "success": True
        }
