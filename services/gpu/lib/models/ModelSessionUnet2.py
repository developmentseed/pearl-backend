import logging
import os
import sys

import joblib
import numpy as np
import sklearn.base
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import f1_score
from sklearn.model_selection import train_test_split

from .ModelSessionAbstract import ModelSession

sys.path.append("..")
LOGGER = logging.getLogger("server")


class Unet2(nn.Module):
    def __init__(
        self,
        feature_scale=1,
        n_classes=3,
        in_channels=3,
        is_deconv=True,
        is_batchnorm=False,
    ):
        """
        Args:
            feature_scale: the smallest number of filters (depth c) is 64 when feature_scale is 1,
                           and it is 32 when feature_scale is 2
            n_classes: number of output classes
            in_channels: number of channels in input
            is_deconv:
            is_batchnorm:
        """

        super(Unet2, self).__init__()

        self.is_deconv = is_deconv
        self.in_channels = in_channels
        self.is_batchnorm = is_batchnorm
        self.feature_scale = feature_scale

        assert (
            64 % self.feature_scale == 0
        ), f"feature_scale {self.feature_scale} does not work with this UNet"

        filters = [
            64,
            128,
            256,
            512,
            1024,
        ]  # this is `c` in the diagram, [c, 2c, 4c, 8c, 16c]
        filters = [int(x / self.feature_scale) for x in filters]
        logging.info("filters used are: {}".format(filters))

        # downsampling
        self.conv1 = UnetConv2(self.in_channels, filters[0], self.is_batchnorm)
        self.maxpool1 = nn.MaxPool2d(kernel_size=2)

        self.conv2 = UnetConv2(filters[0], filters[1], self.is_batchnorm)
        self.maxpool2 = nn.MaxPool2d(kernel_size=2)

        self.conv3 = UnetConv2(filters[1], filters[2], self.is_batchnorm)
        self.maxpool3 = nn.MaxPool2d(kernel_size=2)

        self.conv4 = UnetConv2(filters[2], filters[3], self.is_batchnorm)
        self.maxpool4 = nn.MaxPool2d(kernel_size=2)

        self.center = UnetConv2(filters[3], filters[4], self.is_batchnorm)

        # upsampling
        self.up_concat4 = UnetUp(filters[4], filters[3], self.is_deconv)
        self.up_concat3 = UnetUp(filters[3], filters[2], self.is_deconv)
        self.up_concat2 = UnetUp(filters[2], filters[1], self.is_deconv)
        self.up_concat1 = UnetUp(filters[1], filters[0], self.is_deconv)

        # final conv (without any concat)
        self.final = nn.Conv2d(filters[0], n_classes, kernel_size=1)

    def forward(self, inputs):
        conv1 = self.conv1(inputs)
        maxpool1 = self.maxpool1(conv1)

        conv2 = self.conv2(maxpool1)
        maxpool2 = self.maxpool2(conv2)

        conv3 = self.conv3(maxpool2)
        maxpool3 = self.maxpool3(conv3)

        conv4 = self.conv4(maxpool3)
        maxpool4 = self.maxpool4(conv4)

        center = self.center(maxpool4)
        up4 = self.up_concat4(conv4, center)
        up3 = self.up_concat3(conv3, up4)
        up2 = self.up_concat2(conv2, up3)
        up1 = self.up_concat1(conv1, up2)

        final = self.final(up1)

        return final

    def forward_features(self, inputs):
        conv1 = self.conv1(inputs)
        maxpool1 = self.maxpool1(conv1)

        conv2 = self.conv2(maxpool1)
        maxpool2 = self.maxpool2(conv2)

        conv3 = self.conv3(maxpool2)
        maxpool3 = self.maxpool3(conv3)

        conv4 = self.conv4(maxpool3)
        maxpool4 = self.maxpool4(conv4)

        center = self.center(maxpool4)
        up4 = self.up_concat4(conv4, center)
        up3 = self.up_concat3(conv3, up4)
        up2 = self.up_concat2(conv2, up3)
        up1 = self.up_concat1(conv1, up2)

        return up1


class UnetConv2(nn.Module):
    def __init__(self, in_channels, out_channels, is_batchnorm):
        super(UnetConv2, self).__init__()

        if is_batchnorm:
            self.conv1 = nn.Sequential(
                # this amount of padding/stride/kernel_size preserves width/height
                nn.Conv2d(
                    in_channels, out_channels, kernel_size=3, stride=1, padding=1
                ),
                nn.BatchNorm2d(out_channels),
                nn.ReLU(),
            )
            self.conv2 = nn.Sequential(
                nn.Conv2d(
                    out_channels, out_channels, kernel_size=3, stride=1, padding=1
                ),
                nn.BatchNorm2d(out_channels),
                nn.ReLU(),
            )
        else:
            self.conv1 = nn.Sequential(
                nn.Conv2d(
                    in_channels, out_channels, kernel_size=3, stride=1, padding=1
                ),
                nn.ReLU(),
            )
            self.conv2 = nn.Sequential(
                nn.Conv2d(
                    out_channels, out_channels, kernel_size=3, stride=1, padding=1
                ),
                nn.ReLU(),
            )

    def forward(self, inputs):
        outputs = self.conv1(inputs)
        outputs = self.conv2(outputs)
        return outputs


class UnetUp(nn.Module):
    def __init__(self, in_channels, out_channels, is_deconv):
        """
        is_deconv:  use transposed conv layer to upsample - parameters are learnt; otherwise use
                    bilinear interpolation to upsample.
        """
        super(UnetUp, self).__init__()

        self.conv = UnetConv2(in_channels, out_channels, False)

        self.is_deconv = is_deconv
        if is_deconv:
            self.up = nn.ConvTranspose2d(
                in_channels, out_channels, kernel_size=2, stride=2
            )
        # UpsamplingBilinear2d is deprecated in favor of interpolate()
        # else:
        #     self.up = nn.UpsamplingBilinear2d(scale_factor=2)

    def forward(self, inputs1, inputs2):
        """
        inputs1 is from the downward path, of higher resolution
        inputs2 is from the 'lower' layer. It gets upsampled (spatial size increases) and its depth (channels) halves
        to match the depth of inputs1, before being concatenated in the depth dimension.
        """
        if self.is_deconv:
            outputs2 = self.up(inputs2)
        else:
            # scale_factor is the multiplier for spatial size
            outputs2 = F.interpolate(
                inputs2, scale_factor=2, mode="bilinear", align_corners=True
            )

        offset = outputs2.size()[2] - inputs1.size()[2]
        padding = 2 * [offset // 2, offset // 2]
        outputs1 = F.pad(inputs1, padding)

        return self.conv(torch.cat([outputs1, outputs2], dim=1))


class LoadUnet2(ModelSession):
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

        self.output_channels = len(self.classes)
        self.output_features = 64
        self.model = Unet2(
            feature_scale=1,
            n_classes=len(self.classes),
            in_channels=4,
            is_deconv=True,
            is_batchnorm=False,
        )
        self._init_model()

        for param in self.model.parameters():
            param.requires_grad = False

        self.augment_model = sklearn.base.clone(LoadUnet2.AUGMENT_MODEL)

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
                )
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

        self.augment_model.fit(x_train, y_train)

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

        self.model.final.weights = nn.Parameter(new_weights)
        self.model.final.bias = nn.Parameter(new_biases)

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
        self.model = Unet2(
            feature_scale=1,
            n_classes=len(chkpt["classes"]),
            in_channels=4,
            is_deconv=True,
            is_batchnorm=False,
        )
        checkpoint = torch.load(self.model_fs, map_location=self.device)
        self.model.load_state_dict(checkpoint)
        self.model = self.model.to(self.device)

        return {"message": "Loaded model state", "success": True}
