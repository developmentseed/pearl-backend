import logging
import os
import sys

import albumentations as A
from albumentations.pytorch import ToTensorV2
import joblib
import numpy as np
import sklearn.base
import torch
import torch.nn as nn
import torch.nn.functional as F
import segmentation_models_pytorch as smp
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import f1_score
from sklearn.model_selection import train_test_split
from torch.utils.data import Dataset

from .ModelSessionAbstract import ModelSession

sys.path.append("..")
LOGGER = logging.getLogger("server")

from typing import Optional, Union, List


class InferenceDataSet(Dataset):
    def __init__(self, api, timeframe):
        self.api = api
        self.mosaic = timeframe.mosaic
        self.tiles = timeframe.tiles
        self.tfm = A.Compose([ToTensorV2()])

    def __getitem__(self, idx):
        zxy = self.tiles[idx]

        in_memraster = False
        while in_memraster is False:
            try:
                in_memraster = self.api.get_tile(self.mosaic, zxy.z, zxy.x, zxy.y)
            except:
                print("InferenceDataSet ERROR", sys.exc_info()[0])
        tile = in_memraster.data # tile shape: HxWxC as expected by albumentation transforms
        # tile = tile.transpose(1,2,0)
        tile = tile / 255.0  # Normalize to 0-1
        tile = self.tfm(image=tile)["image"]
        return (
            tile,
            np.array([in_memraster.x, in_memraster.y, in_memraster.z]),
        )  # to-do also return x,y,z

    def __len__(self):
        return len(self.tiles)

def forward_features(model, images):
    embeddings = model.encoder(images)
    features = model.decoder(*embeddings)
    return F.interpolate(features, scale_factor=4)

class LoadS2ADeepLabv3plus(ModelSession):
    """
    Initalizes Model.
    """

    AUGMENT_MODEL = SGDClassifier(
        loss="log",
        shuffle=True,
        n_jobs=-1,
        learning_rate="constant",
        eta0=0.001,
        warm_start=True,
        verbose=False,
    )

    def __init__(self, gpu_id, model_dir, classes):
        """
        Make Retraining Model
        """
        self.model_dir = model_dir
        self.classes = classes
        # self.classes = [{"name": "Forest", "color": "#6CA966"},
        #                 {"name": "Dry jungle", "color": "#D0F3AB"},
        #                 {"name": "Humid Jungle", "color": "#D2AD74"},
        #                 {"name": "Pasture", "color": "#486DA2"},
        #                 {"name": "Agriculture", "color": "#F10100"},
        #                 {"name": "Urban", "color": "#FFC300"},
        #                 {"name": "Without Apparent Vegetation", "color":"#FF5733"},
        #                 {"name": "Water", "color":"#48F374"},
        #                 {"name": "Scrub", "color":"#D52703"},
        #                 {"name": "Bare Soil", "color":"#E7F974"},
        #             ]
        self.tfm = A.Compose([ToTensorV2()])


        # initalize counts to be 0
        for i, c in enumerate(self.classes):
            c["counts"] = 0

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        print("# is cuda available?", torch.cuda.is_available())
        print("# GPU or CPU?", self.device)

        self.model = self._init_model()

        for param in self.model.parameters():
            param.requires_grad = False

        self.augment_model = sklearn.base.clone(LoadS2ADeepLabv3plus.AUGMENT_MODEL)

        self._last_tile = None

        self.augment_x_train = []
        self.augment_y_train = []

        self.class_names_mapping = {
            k: v for v, k in enumerate(x["name"] for x in self.classes)
        }  # map class name to integer value

    @property
    def last_tile(self):
        """
        Acccesses last tile
        """
        return self._last_tile

    def _init_model(self):
        """
        Initalizes starter model
        """
        model = smp.create_model(
            arch="DeepLabV3Plus",
            encoder_name="timm-efficientnet-b5",
            encoder_weights=None,
            in_channels=4,
            classes=len(self.classes),
            activation=None,
        )
        
        checkpoint = torch.load(self.model_dir + "/model.pt", map_location=self.device)
        model.load_state_dict(checkpoint)
        model = model.to(self.device)
        model.eval()
        return model

    def loader(self, api, timeframe):
         return InferenceDataSet(api, timeframe);

    def run(self, data, inference_mode=False):
        """
        Runs starter model initial inference
        """
        if inference_mode:
            return self.run_model_on_tile(data)
        else:
            return self.run_model_on_tile_embedding(data)  # fix this

    def retrain(self, classes, **kwargs):
        """
        Runs model retraining.
        """
        names = [x["name"] for x in classes]
        retrain_classes = [{"name": x["name"], "color": x["color"]} for x in classes]

        pixels = [x["retrain_geometry"] for x in classes]
        counts = [len(x) for x in pixels]

        # add re-training counts to classes attribute
        for i, c in enumerate(counts):
            retrain_classes[i]["counts"] = c
            retrain_classes[i]["percent"] = c / sum(counts)

        for i, c in enumerate(self.classes):
            # retraing samples that are in starter model
            if c["name"] in names:
                self.classes[i]["counts"] = (
                    counts[names.index(c["name"])] + self.classes[i]["counts"]
                )
        for i, c in enumerate(self.classes):
            self.classes[i]["percent"] = counts[names.index(c["name"])] / sum(counts)

        # combine starter model classes and retrain classes

        current_class_names = [x["name"] for x in self.classes]

        self.classes = self.classes + [
            x for x in retrain_classes if not x["name"] in current_class_names
        ]  # don't check against entire dict
        self.augment_x_train = self.augment_x_train + [
            item.value for sublist in pixels for item in sublist
        ]  # get pixel values

        print("self.classes")

        print(self.classes)

        names_retrain = []
        for i, c in enumerate(counts):
            names_retrain.append(list(np.repeat(names[i], c)))

        names_retrain = [x for sublist in names_retrain for x in sublist]

        ints_retrain = []
        for name in names_retrain:
            if name not in list(self.class_names_mapping.keys()):
                self.class_names_mapping.update(
                    {name: max(self.class_names_mapping.values()) + 1}
                )  # to-do? this new classs name + value need to stay in the dictionary for future re-training iterations
            ints_retrain.append(self.class_names_mapping.get(name))

        self.augment_y_train = self.augment_y_train + ints_retrain
        x_user = np.array(self.augment_x_train)
        y_user = np.array(self.augment_y_train)

        # split user submitted re-training data into test 20% and train 80%
        x_train_user, x_test_user, y_train_user, y_test_user = train_test_split(
            x_user, y_user, test_size=0.1, random_state=0, stratify=y_user
        )
        print("y user")
        print(np.unique(y_user, return_counts=True))

        print("y user test")
        print(np.unique(y_test_user, return_counts=True))

        print("y user train")
        print(np.unique(y_train_user, return_counts=True))

        # Place holder to load in seed npz
        seed_data = np.load(self.model_dir + "/model.npz", allow_pickle=True)
        seed_x = seed_data["embeddings"]
        seed_y = seed_data["labels"]

        x_train = np.vstack((x_train_user, seed_x))
        y_train = np.hstack((y_train_user, seed_y))
        print(np.unique(y_train))

        self.augment_model.classes_ = np.array(list(range(len(np.unique(y_train)))))

        print("augment model classes")
        print(self.augment_model.classes_)

        if x_train.shape[0] == 0:
            return {
                "message": "Need to add training samples in order to train",
                "success": False,
            }

        # self.augment_model.classes_ = np.array(np.unique(y_train))

        self.augment_model.fit(
            x_train, y_train
        )  # figure out if this is running on GPU or CPU

        print("coef shape")
        print(self.augment_model.coef_.shape)

        lr_preds = self.augment_model.predict(x_test_user)

        per_class_f1 = f1_score(y_test_user, lr_preds, average=None)

        # add per class f1 to classes attribute
        f1_labels = np.unique(np.concatenate((y_test_user, lr_preds)))
        per_class_f1_final = np.zeros(len(list(self.class_names_mapping.keys())))

        missing_labels = np.setdiff1d(
            list(np.arange(len(list(self.class_names_mapping.keys())))), f1_labels
        )

        # where the unique cls id exist, fill in f1 per class
        per_class_f1_final[f1_labels] = per_class_f1
        # where is the missing id, fill in np.nan, but actually 0 for db to not break
        per_class_f1_final[missing_labels] = 0

        print("per class f1 final")
        print(per_class_f1_final)

        # add  retrainingper class f1-scores counts to classes attribute
        for i, f1 in enumerate(per_class_f1_final):
            self.classes[i].update({"retraining_f1score": f1})

        global_f1 = f1_score(y_test_user, lr_preds, average="weighted")
        print("Global f1-score: %0.4f" % (global_f1))

        score = self.augment_model.score(x_test_user, y_test_user)
        print("Fine-tuning accuracy: %0.4f" % (score))

        new_weights = torch.from_numpy(
            self.augment_model.coef_.copy().astype(np.float32)[:, :, None, None])
        new_biases = torch.from_numpy(self.augment_model.intercept_.astype(np.float32))

        with torch.no_grad():
            self.model.segmentation_head[0].weight = nn.Parameter(new_weights)
            self.model.segmentation_head[0].bias = nn.Parameter(new_biases)

        self.model.to(self.device)
        self.model.eval()
        print("last layer of pytorch model updated post retraining")

        return {"message": "Accuracy Score on data: %0.2f" % (score), "success": True}

    def undo(self):
        """
        Removes label point
        """
        if len(self.augment_y_train) > 0:
            self.augment_x_train.pop()
            self.augment_y_train.pop()
            return {"message": "Undid training sample", "success": True}
        else:
            return {"message": "Nothing to undo", "success": False}

    def add_sample_point(self, row, col, class_idx):
        """
        Adds sample point for retraining
        """
        if self._last_tile is not None:
            self.augment_x_train.append(self._last_tile[row, col, :].copy())
            self.augment_y_train.append(class_idx)
            return {
                "message": "Training sample for class %d added" % (class_idx),
                "success": True,
            }
        else:
            return {
                "message": "Must run model before adding a training sample",
                "success": False,
            }

    def run_model_on_tile_embedding(self, tile):
        """
        Gets embeddings for each tile for retraining.

        Input:
            tile: numpy array of shape (h, w, c)
        """
        tile = tile / 255.0  # Normalize to 0-1
        tile = self.tfm(image=tile)["image"]
        data = tile.to(dtype=torch.float32, device=self.device)

        with torch.no_grad():
            features = forward_features(self.model, data[None, ...])
        features = (features
                        .detach()
                        .squeeze() # remove the batch dimension
                        .cpu().numpy()
                        .transpose(1, 2, 0)) # move the channel dimension to the end
        return features

    def run_model_on_tile(self, tile):
        """
        Gets model predictions for a batch of tiles.

        Input:
            tile: torch dataset of shape (bs, c, h, w)
        """
        data = tile.to(dtype=torch.float32, device=self.device) # tile: bs, c, h, w
        with torch.no_grad():
            logits = self.model(data)
            return torch.argmax(torch.softmax(logits, dim=1), dim=1).detach().cpu().numpy()

    def save_state_to(self, directory):
        """
        Saves model weights checkpoint
        """
        torch.save(
            self.model.state_dict(), os.path.join(directory, "retraining_checkpoint.pt")
        )
        np.save(
            os.path.join(directory, "augment_x_train.npy"),
            np.array(self.augment_x_train),
        )
        np.save(
            os.path.join(directory, "augment_y_train.npy"),
            np.array(self.augment_y_train),
        )

        joblib.dump(
            self.augment_model, os.path.join(directory, "augment_model.p")
        )  # how to save sklearn models (used in re-training)
        return {"message": "Saved model state", "success": True}

    def load_state_from(self, chkpt, chkpt_fs):
        """
        Loads in checkpoint and retraining embedding, label pairs"
        """
        self.augment_x_train = []
        self.augment_y_train = []

        for sample in np.load(os.path.join(chkpt_fs, "augment_x_train.npy")):
            self.augment_x_train.append(sample)
        for sample in np.load(os.path.join(chkpt_fs, "augment_y_train.npy")):
            self.augment_y_train.append(sample)

        self.augment_model = joblib.load(os.path.join(chkpt_fs, "augment_model.p"))
        self.model_fs = os.path.join(chkpt_fs, "retraining_checkpoint.pt")

        self.classes = chkpt["classes"]
        self.model = smp.create_model(
            arch="DeepLabV3Plus",
            encoder_name="timm-efficientnet-b5",
            encoder_weights=None,
            in_channels=4,
            classes=len(self.classes),
            activation=None,
        )
        
        checkpoint = torch.load(self.model_fs, map_location=self.device)
        self.model.load_state_dict(checkpoint)
        self.model = self.model.to(self.device)
        self.model.eval()
        
        return {"message": "Loaded model state", "success": True}
