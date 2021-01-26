#! /usr/bin/env python

import sys
import jwt
import json
import os
import argparse
import asyncio
import websockets
import logging
from lib.api import API
from lib.Model import Model
from web_tool.ModelSessionKerasExample import KerasDenseFineTune
from web_tool.ModelSessionPytorchSolar import SolarFineTuning
from web_tool.ModelSessionPyTorchExample import TorchFineTuning
from web_tool.ModelSessionRandomForest import ModelSessionRandomForest
from web_tool.Utils import setup_logging, serialize, deserialize

LOGGER = logging.getLogger("server")

def main():
    parser = argparse.ArgumentParser(description="AI for Earth Land Cover Worker")

    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose debugging", default=False)
    parser.add_argument("--gpu_id", action="store", dest="gpu_id", type=int, help="GPU to use", required=False)
    parser.add_argument("--model_id", action="store", dest="model_id", type=int, help="Model to initiate", required=False)
    parser.add_argument("--instance_id", action="store", dest="instance_id", type=int, help="ID of GPU Instance", required=False)

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
    os.environ['INSTANCE_ID'] = os.environ["INSTANCE_ID"] if os.environ.get("INSTANCE_ID") is not None else args.instance_id

    os.environ["API"] = os.environ["API"] if os.environ.get("API") is not None else args.api
    os.environ["SOCKET"] = os.environ["SOCKET"] if os.environ.get("SOCKET") is not None else args.socket
    if os.environ["SigningSecret"] is None:
        raise Exception("SigningSecret Env Var Required")

    token = jwt.encode({
        "t": "admin",
        "i": os.environ['INSTANCE_ID']
    }, os.environ["SigningSecret"], algorithm="HS256")

    api = API(os.environ["API"], token)

    model_id = os.environ['MODEL_ID']

    LOGGER.info("Downloading Model Metadata")
    model = api.model_meta(model_id)

    LOGGER.info("Downloading Model")
    model_fs = api.model_download(model_id)

    model = load(args.gpu_id, model, model_fs)

    asyncio.get_event_loop().run_until_complete(
        connection('ws://localhost:1999?token={}'.format(token), model)
    )

async def connection(uri, model):
    async with websockets.connect(uri) as websocket:
        LOGGER.info("WebSocket Connection Initialized")

        while True:
            try:
                msg = json.load(await websocket.recv())
            except Exception:
                LOGGER.error("Failed to decode websocket message")

            action = msg.get('action')

            if action == "instance#terminate":
                # Save Checkpoint
                # Mark instance as terminated in API
                # Shut down
                break
            elif action == "model#reset":
                model.reset()
            elif action == "model#undo":
                mode.undo()

def load(gpu_id, model, model_fs):
    model_type = model["model_type"]

    if model_type == "keras_example":
        model = KerasDenseFineTune(gpu_id, model, model_fs)
    elif model_type == "pytorch_example":
        model = TorchFineTuning(gpu_id, model, model_fs)
    elif model_type == "pytorch_solar":
        model = SolarFineTuning(gpu_id, model, model_fs)
    elif model_type == "random_forest":
        model = ModelSessionRandomForest(model, model_fs)
    else:
        raise NotImplementedError("The given model type is not implemented yet.")

    return Model(model)

if __name__ == "__main__":
    main()
