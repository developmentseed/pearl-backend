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

sys.path.append("..")
LOGGER = logging.getLogger("server")

from typing import Optional, Union, List


class Unet(smp.base.SegmentationModel):
    """Unet_ is a fully convolution neural network for image semantic segmentation. Consist of *encoder*
    and *decoder* parts connected with *skip connections*. Encoder extract features of different spatial
    resolution (skip connections) which are used by decoder to define accurate segmentation mask. Use *concatenation*
    for fusing decoder blocks with skip connections.
    Args:
        encoder_name: Name of the classification model that will be used as an encoder (a.k.a backbone)
            to extract features of different spatial resolution
        encoder_depth: A number of stages used in encoder in range [3, 5]. Each stage generate features
            two times smaller in spatial dimensions than previous one (e.g. for depth 0 we will have features
            with shapes [(N, C, H, W),], for depth 1 - [(N, C, H, W), (N, C, H // 2, W // 2)] and so on).
            Default is 5
        encoder_weights: One of **None** (random initialization), **"imagenet"** (pre-training on ImageNet) and
            other pretrained weights (see table with available weights for each encoder_name)
        decoder_channels: List of integers which specify **in_channels** parameter for convolutions used in decoder.
            Length of the list should be the same as **encoder_depth**
        decoder_use_batchnorm: If **True**, BatchNorm2d layer between Conv2D and Activation layers
            is used. If **"inplace"** InplaceABN will be used, allows to decrease memory consumption.
            Available options are **True, False, "inplace"**
        decoder_attention_type: Attention module used in decoder of the model. Available options are **None** and **scse**.
            SCSE paper - https://arxiv.org/abs/1808.08127
        in_channels: A number of input channels for the model, default is 3 (RGB images)
        classes: A number of classes for output mask (or you can think as a number of channels of output mask)
        activation: An activation function to apply after the final convolution layer.
            Available options are **"sigmoid"**, **"softmax"**, **"logsoftmax"**, **"tanh"**, **"identity"**, **callable** and **None**.
            Default is **None**
        aux_params: Dictionary with parameters of the auxiliary output (classification head). Auxiliary output is build
            on top of encoder if **aux_params** is not **None** (default). Supported params:
                - classes (int): A number of classes
                - pooling (str): One of "max", "avg". Default is "avg"
                - dropout (float): Dropout factor in [0, 1)
                - activation (str): An activation function to apply "sigmoid"/"softmax" (could be **None** to return logits)
    Returns:
        ``torch.nn.Module``: Unet
    .. _Unet:
        https://arxiv.org/abs/1505.04597
    """

    def __init__(
        self,
        encoder_name: str = "resnet34",
        encoder_depth: int = 5,
        encoder_weights: Optional[str] = "imagenet",
        decoder_use_batchnorm: bool = True,
        decoder_channels: List[int] = (256, 128, 64, 32, 16),
        decoder_attention_type: Optional[str] = None,
        in_channels: int = 3,
        classes: int = 1,
        activation: Optional[Union[str, callable]] = None,
        aux_params: Optional[dict] = None,
    ):
        super().__init__()

        self.encoder = smp.encoders.get_encoder(
            encoder_name,
            in_channels=in_channels,
            depth=encoder_depth,
            weights=encoder_weights,
        )

        self.decoder = smp.unet.decoder.UnetDecoder(
            encoder_channels=self.encoder.out_channels,
            decoder_channels=decoder_channels,
            n_blocks=encoder_depth,
            use_batchnorm=decoder_use_batchnorm,
            center=True if encoder_name.startswith("vgg") else False,
            attention_type=decoder_attention_type,
        )

        self.segmentation_head = smp.base.SegmentationHead(
            in_channels=decoder_channels[-1],
            out_channels=classes,
            activation=activation,
            kernel_size=1,
        )

        if aux_params is not None:
            self.classification_head = smp.base.ClassificationHead(
                in_channels=self.encoder.out_channels[-1], **aux_params
            )
        else:
            self.classification_head = None

        self.name = "u-{}".format(encoder_name)
        self.initialize()


class LoadUnet(ModelSession):
    """
    Initalizes Model.
    """

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
        self.model = Unet(
            encoder_name="resnet18",
            encoder_depth=3,
            encoder_weights=None,
            decoder_channels=(128, 64, 64),
            in_channels=4,
            classes=len(self.classes),
        )
        self._init_model()

        for param in self.model.parameters():
            param.requires_grad = False

        # self.augment_model = sklearn.base.clone(TorchFineTuning.AUGMENT_MODEL)

        self._last_tile = None

        self.augment_x_train = []
        self.augment_y_train = []

        self.class_names_mapping = {
            k: v for v, k in enumerate(x["name"] for x in self.classes)
        }  # map class name to integer value

    def _init_model(self):
        """
        Initalizes starter model
        """
        checkpoint = torch.load(self.model_dir + "/model.pt", map_location=self.device)
        self.model.load_state_dict(checkpoint)
        self.model.eval()
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
        pass

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
        pass

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
        self.model = Unet(
            encoder_name="resnet18",
            encoder_depth=3,
            encoder_weights=None,
            decoder_channels=(128, 64, 64),
            in_channels=4,
            classes=len(self.classes),
        )

        checkpoint = torch.load(self.model_fs, map_location=self.device)
        self.model.load_state_dict(checkpoint)
        self.model = self.model.to(self.device)

        return {"message": "Loaded model state", "success": True}
