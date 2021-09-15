import logging
import os
import sys

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

from .ModelSessionAbstract import ModelSession
from typing import Optional, Union, List

sys.path.append("..")
LOGGER = logging.getLogger("server")


class DeepLabv3Plus(smp.base.SegmentationModel):
    """DeepLabV3+ implementation from "Encoder-Decoder with Atrous Separable
    Convolution for Semantic Image Segmentation"
    Args:
        encoder_name: Name of the classification model that will be used as an encoder (a.k.a backbone)
            to extract features of different spatial resolution
        encoder_depth: A number of stages used in encoder in range [3, 5]. Each stage generate features
            two times smaller in spatial dimensions than previous one (e.g. for depth 0 we will have features
            with shapes [(N, C, H, W),], for depth 1 - [(N, C, H, W), (N, C, H // 2, W // 2)] and so on).
            Default is 5
        encoder_weights: One of **None** (random initialization), **"imagenet"** (pre-training on ImageNet) and
            other pretrained weights (see table with available weights for each encoder_name)
        encoder_output_stride: Downsampling factor for last encoder features (see original paper for explanation)
        decoder_atrous_rates: Dilation rates for ASPP module (should be a tuple of 3 integer values)
        decoder_channels: A number of convolution filters in ASPP module. Default is 256
        in_channels: A number of input channels for the model, default is 3 (RGB images)
        classes: A number of classes for output mask (or you can think as a number of channels of output mask)
        activation: An activation function to apply after the final convolution layer.
            Available options are **"sigmoid"**, **"softmax"**, **"logsoftmax"**, **"tanh"**, **"identity"**, **callable** and **None**.
            Default is **None**
        upsampling: Final upsampling factor. Default is 4 to preserve input-output spatial shape identity
        aux_params: Dictionary with parameters of the auxiliary output (classification head). Auxiliary output is build
            on top of encoder if **aux_params** is not **None** (default). Supported params:
                - classes (int): A number of classes
                - pooling (str): One of "max", "avg". Default is "avg"
                - dropout (float): Dropout factor in [0, 1)
                - activation (str): An activation function to apply "sigmoid"/"softmax" (could be **None** to return logits)
    Returns:
    Reference:
        https://arxiv.org/abs/1802.02611v3
    """

    def __init__(
        self,
        encoder_name: str = "resnet34",
        encoder_depth: int = 5,
        encoder_weights: Optional[str] = "imagenet",
        encoder_output_stride: int = 16,
        decoder_channels: int = 256,
        decoder_atrous_rates: tuple = (12, 24, 36),
        in_channels: int = 3,
        classes: int = 1,
        activation: Optional[str] = None,
        upsampling: int = 4,
        aux_params: Optional[dict] = None,
    ):
        super().__init__()

        if encoder_output_stride not in [8, 16]:
            raise ValueError(
                "Encoder output stride should be 8 or 16, got {}".format(
                    encoder_output_stride
                )
            )

        self.encoder = smp.encoder.get_encoder(
            encoder_name,
            in_channels=in_channels,
            depth=encoder_depth,
            weights=encoder_weights,
            output_stride=encoder_output_stride,
        )

        self.decoder = smp.decoder.DeepLabV3PlusDecoder(
            encoder_channels=self.encoder.out_channels,
            out_channels=decoder_channels,
            atrous_rates=decoder_atrous_rates,
            output_stride=encoder_output_stride,
        )

        self.segmentation_head = smp.base.SegmentationHead(
            in_channels=self.decoder.out_channels,
            out_channels=classes,
            activation=activation,
            kernel_size=1,
            upsampling=upsampling,
        )

        if aux_params is not None:
            self.classification_head = smp.base.ClassificationHead(
                in_channels=self.encoder.out_channels[-1], **aux_params
            )
        else:
            self.classification_head = None

    def forward(self, x):
        """Sequentially pass `x` trough model`s encoder, decoder and heads"""
        features = self.encoder(x)
        decoder_output = self.decoder(*features)

        masks = self.segmentation_head(decoder_output)

        if self.classification_head is not None:
            labels = self.classification_head(features[-1])
            return masks, labels
        return masks

    def foward_features(self, x):
        features = self.encoder(x)
        decoder_output = self.decoder(*features)
        return decoder_output


class LoadDeepLabv3Plus(ModelSession):
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

        # initalize counts to be 0
        for i, c in enumerate(self.classes):
            c["counts"] = 0

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        print("# is cuda available?", torch.cuda.is_available())
        print("# GPU or CPU?", self.device)

        # will need to figure out for re-training
        self.output_channels = len(self.classes)
        self.output_features = 64
        self.model = DeepLabv3Plus(
            encoder_name="resnet18",
            encoder_weights=None,
            in_channels=4,
            classes=len(self.classes),
        )
        self._init_model()

        for param in self.model.parameters():
            param.requires_grad = False

        self.augment_model = sklearn.base.clone(LoadDeepLabv3Plus.AUGMENT_MODEL)

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

    def trim_state_dict(self):
        new_state_dict = dict()
        pth = self.model_dir + "/model.ckpt"
        for k, v in pth.items():
            if k.startswith("model."):
                k = k[6:]
            new_state_dict[k] = v
        return new_state_dict

    def _init_model(self):
        """
        Initalizes starter model
        """
        checkpoint = torch.load(
            self.model_dir + "/model.ckpt", map_location=self.device
        )
        self.model.load_state_dict(trim_state_dict(checkpoint))
        self.model.eval()
        for param in model.parameters():
            param.requires_grad = False
        self.model = self.model.to(self.device)

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
            self.augment_model.coef_.copy().astype(np.float32)[
                :, :, np.newaxis, np.newaxis
            ]
        )
        new_biases = torch.from_numpy(self.augment_model.intercept_.astype(np.float32))
        new_weights = new_weights.to(self.device)
        print("new_weights shape: ")
        print(new_weights.shape)
        new_biases = new_biases.to(self.device)
        print("new_biases shape: ")
        print(new_biases.shape)

        self.model.segmentation_head[0].weight = nn.Parameter(new_weights)
        self.model.segmentation_head[0].bias = nn.Parameter(new_biases)

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
        Gets embeddings for retraining
        """

        tile = np.moveaxis(tile, -1, 0)  # go from channels last to channels first
        tile = tile / 255.0
        tile = tile.astype(np.float32)
        tile_img = torch.from_numpy(tile)
        tile_img = torch.from_numpy(tile)
        data = tile_img.to(self.device)

        with torch.no_grad():
            features = self.model.forward_features(data[None, ...])
            # insert singleton "batch" dimension to input data for pytorch to be happy
        # get embeddings
        features = np.rollaxis(features.squeeze().cpu().numpy(), 0, 3)
        return features

    def run_model_on_tile(self, tile):
        """
        Gets model predicted classes per tile
        """
        output_preds = []
        data = tile.to(self.device)
        with torch.no_grad():
            predictions = self.model(data)
            predictions = (
                F.softmax(predictions, dim=1).cpu().numpy()
            )  # this is giving us the highest probability class per pixel

        for pred in predictions:
            output_preds.append(pred.argmax(axis=0).astype(np.uint8))

        return np.array(output_preds)

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
        self.model = DeepLabv3Plus(
            encoder_name="resnet18",
            encoder_weights=None,
            in_channels=4,
            classes=len(chkpt["classes"]),
        )

        checkpoint = torch.load(self.model_fs, map_location=self.device)
        self.model.load_state_dict(checkpoint)
        self.model = self.model.to(self.device)

        return {"message": "Loaded model state", "success": True}
