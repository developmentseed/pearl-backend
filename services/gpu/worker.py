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
from lib.ModelSrv import ModelSrv
from web_tool.ModelSessionKerasExample import KerasDenseFineTune
from web_tool.ModelSessionPytorchSolar import SolarFineTuning
from web_tool.ModelSessionPyTorchExample import TorchFineTuning
from web_tool.ModelSessionRandomForest import ModelSessionRandomForest
from web_tool.Utils import setup_logging

LOGGER = logging.getLogger("server")

def main():
    parser = argparse.ArgumentParser(description="AI for Earth Land Cover Worker")

    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose debugging", default=False)
    parser.add_argument("--gpu_id", action="store", dest="gpu_id", type=int, help="GPU to use", required=False)
    parser.add_argument("--instance_id", action="store", dest="instance_id", type=int, help="Model to initiate", required=False)

    parser.add_argument("--socket", action="store", type=str, help="websocket router url to connect to", default=None)
    parser.add_argument("--api", action="store", type=str, help="api url to connect to", default=None)

    args = parser.parse_args(sys.argv[1:])

    # Setup logging
    log_path = os.path.join(os.getcwd(), "tmp/logs/")
    setup_logging(log_path, "worker")

    os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
    os.environ["CUDA_VISIBLE_DEVICES"] = arg([args.gpu_id], "")
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

    os.environ['INSTANCE_ID'] = arg([os.environ.get('INSTANCE_ID'), args.instance_id])
    os.environ["API"] = arg([os.environ.get("API"), args.api], 'http://localhost:2000')

    os.environ["SOCKET"] = arg([os.environ.get("SOCKET"), args.socket], 'http://localhost:1999')
    os.environ["SigningSecret"] = arg([os.environ.get("SigningSecret")], 'dev-secret')

    token = jwt.encode({
        "t": "admin",
        "i": os.environ['INSTANCE_ID']
    }, os.environ["SigningSecret"], algorithm="HS256")

    api = API(os.environ["API"], token, os.environ['INSTANCE_ID'])

    model = load(args.gpu_id, api)

    asyncio.get_event_loop().run_until_complete(
        connection('ws://localhost:1999?token={}'.format(token), model)
    )

async def connection(uri, model):
    async with websockets.connect(uri) as websocket:
        LOGGER.info("ok - WebSocket Connection Initialized")

        while True:
            try:
                msg = await websocket.recv()
                msg = json.load(msg)

                action = msg.get('action')

                if action == "instance#terminate":
                    # Save Checkpoint
                    # Mark instance as terminated in API
                    # Shut down
                    break
                elif action == "model#run":
                    model.run()
                elif action == "model#reset":
                    model.reset()
                elif action == "model#undo":
                    model.undo()
                elif action == "model#last_tile":
                    model.last_tile()
                elif action == "model#add_sample":
                    model.add_sample_point()
                elif action == "model#checkpoint":
                    model.save_state_to()

            except Exception:
                LOGGER.error("Failed to decode websocket message")
                LOGGER.error(msg)


def load(gpu_id, api):
    model_type = api.model["model_type"]

    if model_type == "keras_example":
        model = KerasDenseFineTune(gpu_id, api.model, api.model_fs)
    elif model_type == "pytorch_example":
        model = TorchFineTuning(gpu_id, api.model, api.model_fs)
    elif model_type == "pytorch_solar":
        model = SolarFineTuning(gpu_id, api.model, api.model_fs)
    elif model_type == "random_forest":
        model = ModelSessionRandomForest(api.model, api.model_fs)
    else:
        raise NotImplementedError("The given model type is not implemented yet.")

    return ModelSrv(model)

def arg(iterable, default=False, pred=None):
    """Returns the first true value in the iterable.
       If no true value is found, returns *default*
       If *pred* is not None, returns the first item
       for which pred(item) is true.
    """
    return next(filter(pred, iterable), default)


if __name__ == "__main__":
    main()
