#! /usr/bin/env python
# -*- coding: utf-8 -*-
# vim:fenc=utf-8
# pylint: disable=E1137,E1136,E0110
import sys
import jwt
import os
import time
import datetime
import collections
import argparse
import asyncio
import websockets

import numpy as np

import logging
LOGGER = logging.getLogger("server")

from lib.api import API
from web_tool.ModelSessionKerasExample import KerasDenseFineTune
from web_tool.ModelSessionPytorchSolar import SolarFineTuning
from web_tool.ModelSessionPyTorchExample import TorchFineTuning
from web_tool.ModelSessionRandomForest import ModelSessionRandomForest
from web_tool.Utils import setup_logging, serialize, deserialize

from web_tool.Models import load_models

class MyService():

    def __init__(self, model):
        self.model = model

    def on_connect(self, conn):
        pass

    def on_disconnect(self, conn):
        pass

    def exposed_last_tile(self):
        return serialize(self.model.last_tile)

    def exposed_run(self, tile, inference_mode=False):
        tile = deserialize(tile) # need to serialize/deserialize numpy arrays
        output = self.model.run(tile, inference_mode)
        return serialize(output) # need to serialize/deserialize numpy arrays

    def exposed_retrain(self):
        return self.model.retrain()

    def exposed_add_sample_point(self, row, col, class_idx):
        return self.model.add_sample_point(row, col, class_idx)

    def exposed_undo(self):
        return self.model.undo()

    def exposed_reset(self):
        return self.model.reset()

    def exposed_save_state_to(self, directory):
        return self.model.save_state_to(directory)

    def exposed_load_state_from(self, directory):
        return self.model.load_state_from(directory)

async def connection(uri):
    async with websockets.connect(uri) as websocket:
        LOGGER.info("WebSocket Connection Initialized")
        await websocket.send("Hello world!")
        msg = await websocket.recv()

        print('MSG: ', msg)


def main():
    parser = argparse.ArgumentParser(description="AI for Earth Land Cover Worker")

    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose debugging", default=False)
    parser.add_argument("--gpu_id", action="store", dest="gpu_id", type=int, help="GPU to use", required=False)
    parser.add_argument("--model_id", action="store", dest="model_id", type=int, help="Model to initiate", required=False)

    parser.add_argument("--socket", action="store", type=str, help="websocket router url to connect to", default=None)
    parser.add_argument("--api", action="store", type=str, help="api url to connect to", default=None)

    args = parser.parse_args(sys.argv[1:])

    # Setup logging
    log_path = os.path.join(os.getcwd(), "tmp/logs/")
    setup_logging(log_path, "worker")

    os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
    os.environ["CUDA_VISIBLE_DEVICES"] = "" if args.gpu_id is None else str(args.gpu_id)
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

    os.environ['MODEL_ID'] = os.environ["MODEL_ID"] if os.environ.get("MODEL_ID") is not None else args.model_id

    os.environ["API"] = os.environ["API"] if os.environ.get("API") is not None else args.api
    os.environ["SOCKET"] = os.environ["SOCKET"] if os.environ.get("SOCKET") is not None else args.socket
    if os.environ["SigningSecret"] is None:
        raise Exception("SigningSecret Env Var Required")

    token = jwt.encode({
        "t": "admin"
    }, os.environ["SigningSecret"], algorithm="HS256")

    api = API(os.environ["API"], token)

    model_id = os.environ['MODEL_ID']

    LOGGER.info("Downloading Model Metadata")
    model = api.model_meta(model_id)
    LOGGER.info("Downloading Model")
    model_fs = api.model_download(model_id)

    asyncio.get_event_loop().run_until_complete(
        connection('ws://localhost:1999?token={}'.format(token))
    )

def load(model_type):
    model_type = model_configs[args.model_key]["type"]
    if model_type == "keras_example":
        model = KerasDenseFineTune(args.gpu_id, **model_configs[args.model_key])
    elif model_type == "pytorch_example":
        model = TorchFineTuning(args.gpu_id, **model_configs[args.model_key])
    elif model_type == "pytorch_solar":
        model = SolarFineTuning(args.gpu_id, **model_configs[args.model_key])
    elif model_type == "random_forest":
        model = ModelSessionRandomForest(**model_configs[args.model_key])
    else:
        raise NotImplementedError("The given model type is not implemented yet.")

if __name__ == "__main__":
    main()
