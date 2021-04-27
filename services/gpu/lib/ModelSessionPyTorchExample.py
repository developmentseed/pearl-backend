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
from .InferenceDataSet import InferenceDataSet

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


    def __init__(self, gpu_id, model_dir, classes):
        self.model_dir = model_dir
        self.classes = classes

        # initalize counts to be 0
        for i, c in enumerate(self.classes):
            c['counts'] = 0


        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        print('# is cuda available?', torch.cuda.is_available())
        print('# GPU or CPU?', self.device)

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
        checkpoint = torch.load(self.model_dir + '/model.pt', map_location=self.device)
        self.model.load_state_dict(checkpoint)
        self.model.eval()
        self.model = self.model.to(self.device)


    def run(self, data, inference_mode=False):
        if inference_mode:
            return self.run_model_on_tile(data)
        else:
            return self.run_model_on_tile_embedding(data) #fix this

    def retrain(self, classes, **kwargs):
        names = [x['name'] for x in classes]

        retrain_classes = [{
            'name': x['name'],
            'color': x['color']
        } for x in classes ]

        pixels = [x['retrain_geometry'] for x in classes]
        counts = [len(x) for x in pixels]
        total = sum(counts)

        # add re-training counts to classes attribute
        for i, c in enumerate(counts):
             retrain_classes[i]['counts'] = c
             retrain_classes[i]['percent'] = c / sum(counts)

        for i, c in enumerate(self.classes):
            # retraing samples that are in starter model
            if c['name'] in names:
                self.classes[i]['counts'] = counts[names.index(c['name'])] + self.classes[i]['counts']

        total_retrain_counts = sum(x['counts'] for x in self.classes)
        for i, c in enumerate(self.classes):
            self.classes[i]['percent'] = counts[names.index(c['name'])] / sum(counts)

        # combine starter model classes and retrain classes

        current_class_names = [x['name'] for x in self.classes]

        self.classes = self.classes + [x for x in retrain_classes if not x['name'] in current_class_names] #don't check against entire dict
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
        seed_data = np.load(self.model_dir + '/model.npz', allow_pickle=True)
        seed_x = seed_data['embeddings']
        seed_y = seed_data['labels']

        x_train = np.vstack((x_train, seed_x))
        y_train = np.hstack((y_train, seed_y))

        self.augment_model.classes_ = np.array(list(range(len(np.unique(y_train)))))

        if x_train.shape[0] == 0:
            return {
                "message": "Need to add training samples in order to train",
                "success": False
            }



        # split re-training data into test 10% and train 90%
        # TO-DO confirm post split that all unqiue class labels are present in training!
        x_train, x_test, y_train, y_test = train_test_split(
                                            x_train, y_train, test_size=0.1, random_state=0)

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
                self.augment_model.coef_ = np.vstack((w, random_new_weights))


        self.augment_model.fit(x_train, y_train) #figure out if this is running on GPU or CPU

        lr_preds = self.augment_model.predict(x_test)


        per_class_f1 = f1_score(y_test, lr_preds, average=None)

        # add per class f1 to classes attribute
        f1_labels = np.unique(np.concatenate((y_test, lr_preds)))
        per_class_f1_final = np.zeros(len(list(self.class_names_mapping.keys())))

        missing_labels = np.setdiff1d(list(np.arange(len(list(self.class_names_mapping.keys())))), f1_labels)

        # where the unique cls id exist, fill in f1 per calss
        per_class_f1_final[f1_labels] =  per_class_f1
        # where is the missing id, fill in np.nan, but actually 0 for db to not break
        per_class_f1_final[missing_labels] = 0

        # add  retrainingper class f1-scores counts to classes attribute
        for i, f1 in enumerate(per_class_f1_final):
            self.classes[i].update({'retraining_f1score': f1})

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


    def run_model_on_tile_embedding(self, tile):
        tile_img = torch.from_numpy(tile)
        data = tile_img.to(self.device)
        with torch.no_grad():
            predictions = self.model(data[None, ...]) # insert singleton "batch" dimension to input data for pytorch to be happy
            predictions = F.softmax(predictions, dim=1).cpu().numpy()  #this is giving us the highest probability class per pixel

        # get embeddings
        newmodel = torch.nn.Sequential(*(list(self.model.children())[:-1]))
        newmodel.eval()
        with torch.no_grad():
            features = newmodel(data[None, ...])
            features = features.cpu().numpy()
            features = np.moveaxis(features[0], 0, -1)
        predictions = predictions[0].argmax(axis=0).astype(np.uint8)
        return predictions, features



    def run_model_on_tile(self, tile):
        output_preds = []
        data = tile.to(self.device)
        with torch.no_grad():
            predictions = self.model(data)
            predictions = F.softmax(predictions, dim=1).cpu().numpy()
            print(predictions.shape) #this is giving us the highest probability class per pixel


        for pred in predictions:
            output_preds.append(pred.argmax(axis=0).astype(np.uint8))
            print(np.unique(pred.argmax(axis=0).astype(np.uint8)))
            print(pred.argmax(axis=0).astype(np.uint8).shape)

        print(np.array(output_preds).shape)

        return np.array(output_preds)

    def save_state_to(self, directory):
        torch.save(self.model.state_dict(), os.path.join(directory, "retraining_checkpoint.pt"))
        np.save(os.path.join(directory, "augment_x_train.npy"), np.array(self.augment_x_train))
        np.save(os.path.join(directory, "augment_y_train.npy"), np.array(self.augment_y_train))

        joblib.dump(self.augment_model, os.path.join(directory, "augment_model.p")) # how to save sklearn models (used in re-training)
        return {
            "message": "Saved model state",
            "success": True
        }

    def load_state_from(self, chkpt, chkpt_fs):
        self.augment_x_train = []
        self.augment_y_train = []

        for sample in np.load(os.path.join(chkpt_fs, "augment_x_train.npy")):
            self.augment_x_train.append(sample)
        for sample in np.load(os.path.join(chkpt_fs, "augment_y_train.npy")):
            self.augment_y_train.append(sample)

        self.augment_model = joblib.load(os.path.join(chkpt_fs, "augment_model.p"))
        self.model_fs = os.path.join(chkpt_fs, "retraining_checkpoint.pt")

        self.classes = chkpt['classes']
        self.model = FCN(num_input_channels=4, num_output_classes=len(chkpt['classes']), num_filters=64)
        checkpoint = torch.load(self.model_fs, map_location=self.device)
        self.model.load_state_dict(checkpoint)
        self.model = self.model.to(self.device)


        return {
            "message": "Loaded model state",
            "success": True
        }
