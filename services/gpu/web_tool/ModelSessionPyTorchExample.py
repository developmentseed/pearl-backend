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
from sklearn.metrics import f1_score

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

    def forward_features(self,inputs):
        x = F.relu(self.conv1(inputs))
        x = F.relu(self.conv2(x))
        x = F.relu(self.conv3(x))
        x = F.relu(self.conv4(x))
        z = F.relu(self.conv5(x))
        y = self.last(z)
        return y, z

class TorchFineTuning(ModelSession):

    AUGMENT_MODEL = SGDClassifier(
        loss="log",
        shuffle=True,
        n_jobs=-1,
        learning_rate="constant",
        eta0=0.001,
        warm_start=True,
        verbose=False
    )


    def __init__(self, gpu_id, api):
        self.classes = api.model['classes']

        self.model_fs = api.model_fs
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        print(self.device)

        # will need to figure out for re-training
        self.output_channels = len(self.classes)
        self.output_features = 64

        ### TODO
        self.model = FCN(num_input_channels=4, num_output_classes=len(self.classes), num_filters=64)
        self._init_model()

        for param in self.model.parameters():
           param.requires_grad = False

        # will need to figure out for re-training
        self.initial_weights = self.model.last.weight.cpu().detach().numpy().squeeze()  #(10, 64)
        self.initial_biases = self.model.last.bias.cpu().detach().numpy()  #(10,)

        self.augment_model = sklearn.base.clone(TorchFineTuning.AUGMENT_MODEL)

        self.augment_model.coef_ = self.initial_weights.astype(np.float64)
        self.augment_model.intercept_ = self.initial_biases.astype(np.float64)

        self._last_tile = None

        self.augment_x_train = []
        self.augment_y_train = []

        self.class_names_mapping = {k: v for v, k in enumerate(x['name'] for x in self.classes)} #map class name to integer value

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

        #self._last_tile = output_features: is this needed?

        output, output_features = self.run_model_on_tile(tile)

        return output, output_features

    def retrain(self, classes, **kwargs):
        print (self.classes)


        names = [x['name'] for x in classes]
        print(names)


        retrain_classes = [{
            'name': x['name'],
            'color': x['color']
        } for x in classes ]

        print(retrain_classes)
        pixels = [x['geometry'] for x in classes]
        counts = [len(x) for x in pixels]
        print(counts)
        total = sum(counts)

        # add re-training counts to classes attribute
        for i, c in enumerate(counts):
             retrain_classes[i]['retraining_counts'] = c
             retrain_classes[i]['retraining_counts_percent'] = c / sum(counts)

        # update and attribute self.classes with retraining info
        for i, c in enumerate(self.classes):
            print(c)
            if c['name'] in names:
                self.classes[i]['retraining_counts'] = counts[names.index(c['name'])]
                self.classes[i]['retraining_counts_percent'] = counts[names.index(c['name'])] / sum(counts)
            else:
                self.classes[i]['retraining_counts'] = 0
                self.classes[i]['retraining_counts_percent'] = 0
        print(self.classes)

        self.augment_x_train = [item.value  for sublist in pixels for item in sublist]  # get pixel values

        names_retrain = []
        for i, c in enumerate(counts):
             names_retrain.append(list(np.repeat(names[i], c)))

        names_retrain = [x for sublist in names_retrain for x in sublist]

        ints_retrain = []
        for name in names_retrain:
            if name not in list(self.class_names_mapping.keys()):
                self.class_names_mapping.update({name: max(self.class_names_mapping.values()) + 1}) #to-do? this new classs name + value need to stay in the dictionary for future re-training iterations
            ints_retrain.append(self.class_names_mapping.get(name))

        self.augment_y_train =  ints_retrain
        x_train = np.array(self.augment_x_train)
        y_train = np.array(self.augment_y_train)

        # Place holder to load in seed npz
        # seed_x = np.load('_embedding.npz', allow_pickle=True)
        # seed_x = seed_x['arr_0']
        # seed_y = np.load('/_label.npz', allow_pickle=True)
        # seed_y = seed_y['arr_0']


        # Place holder to load in seed npz
        # print (y_train.shape)
        # print(type(y_train))
        # print (seed_y.shape)


        # x_train = np.vstack((x_train, seed_x))
        # print(x_train.shape)
        # y_train = np.hstack((y_train, seed_y))
        # print(y_train.shape)

        self.augment_model.classes_ = np.array(list(range(len(np.unique(y_train)))))

        if x_train.shape[0] == 0:
            return {
                "message": "Need to add training samples in order to train",
                "success": False
            }



        # split re-training data into test 20% and train 80%
        # TO-DO confirm post split that all unqiue class labels are present in training!
        x_train, x_test, y_train, y_test = train_test_split(
                                            x_train, y_train, test_size=0.2, random_state=0)

        self.augment_model.classes_ = np.array(list(range(len(np.unique(y_train)))))

        # Check to see if new classes are added and randomly initaalize weights/biases for new classes.
        if len(np.unique(y_train)) > len(self.augment_model.intercept_):
            for i in range(len(np.unique(y_train)) - len(self.augment_model.intercept_)):
                b = self.augment_model.intercept_
                w = self.augment_model.coef_

                random_new_bias = np.round(b.max() - b.min() * np.random.random_sample() + b.min(), 8)

                random_new_weights = np.round(w.max() - w.min() * np.random.random_sample(((64, 1, 1))) + w.min(), 8)
                random_new_weights = np.expand_dims(random_new_weights, axis=0).squeeze()

                self.augment_model.intercept_ = np.append(b, random_new_bias)
                print(len(self.augment_model.intercept_))
                self.augment_model.coef_ = np.vstack((w, random_new_weights))


        print ('y train unique')
        print (np.unique(y_train))
        self.augment_model.fit(x_train, y_train) #figure out if this is running on GPU or CPU

        lr_preds = self.augment_model.predict(x_test)
        print ('augment model classes')
        print(self.augment_model.classes_)


        per_class_f1 = f1_score(y_test, lr_preds, average=None)
        print ("Per Class f1-score: ")
        print (per_class_f1)

        # add per class f1 to classes attribute
        f1_labels = np.unique(np.concatenate((y_test, lr_preds)))
        per_class_f1_final = np.zeros(len(list(self.class_names_mapping.keys())))
        print(per_class_f1_final.shape)

        missing_labels = np.setdiff1d(list(np.arange(len(list(self.class_names_mapping.keys())))), f1_labels)

        # where the unique cls id exist, fill in f1 per calss
        per_class_f1_final[f1_labels] =  per_class_f1
        # where is the missing id, fill in np.nan
        per_class_f1_final[missing_labels] = 0

        # add  retrainingper class f1-scores counts to classes attribute
        print(self.classes)
        for i, f1 in enumerate(per_class_f1_final):
             self.classes[i]['retraining_f1score'] = f1

        global_f1 = f1_score(y_test, lr_preds, average='weighted')
        print("Global f1-score: %0.4f" % (global_f1))

        score = self.augment_model.score(x_test, y_test)
        print("Fine-tuning accuracy: %0.4f" % (score))

        new_weights = torch.from_numpy(self.augment_model.coef_.copy().astype(np.float32)[:, :, np.newaxis, np.newaxis])
        new_biases = torch.from_numpy(self.augment_model.intercept_.astype(np.float32))
        new_weights = new_weights.to(self.device)
        print ('new_weights shape: ')
        print(new_weights.shape)
        new_biases = new_biases.to(self.device)
        print ('new_biases shape: ')
        print(new_biases.shape)

        # this updates starter pytorch model with weights from re-training, so when the inference(s) follwing re-training run they run on the GPU
        self.model.last.weight = nn.Parameter(new_weights)
        self.model.last.bias = nn.Parameter(new_biases)

        print('last layer of pytorch model updated post retraining')

        return {
            "message": "Accuracy Score on data: %0.2f" % (score),
            "success": True
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

        output = np.zeros((len(self.classes), height, width), dtype=np.float32)
        tile_img = torch.from_numpy(tile)
        data = tile_img.to(self.device)
        with torch.no_grad():
            predictions, features = self.model.forward_features(data[None, ...]) # insert singleton "batch" dimension to input data for pytorch to be happy
            predictions = F.softmax(predictions, dim=1).cpu().numpy() #this is giving us the highest probability class per pixel
            features = features.cpu().numpy() #embeddings per pixel for the image


        predictions = predictions[0].argmax(axis=0).astype(np.uint8)  #using [0] because using a "fake batch" of 1 tile
        features = np.moveaxis(features[0], 0, -1)  #using [0] because using a "fake batch" of 1 tile (shape should be 256, 256, 64)

        return  predictions, features

    def save_state_to(self, directory):


        torch.save(self.model.state_dict(), os.path.join(directory, "retraining_checkpoint.pt"))
        # Do we need to save these?
        np.save(os.path.join(directory, "augment_x_train.npy"), np.array(self.augment_x_train))
        np.save(os.path.join(directory, "augment_y_train.npy"), np.array(self.augment_y_train))

        joblib.dump(self.augment_model, os.path.join(directory, "augment_model.p")) # how to save sklearn models (used in re-training)
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

        # do we need to re-initalize the pytorch model with the new retraining_checkpoint.pt?
        # how to we update for the correct number of classes post retraining?
        self.model_fs = os.path.join(directory, "retraining_checkpoint.pt")

        self.model = FCN(num_input_channels=4, num_output_classes=len(self.classes), num_filters=64)
        self._init_model()

        return {
            "message": "Loaded model state",
            "success": True
        }
