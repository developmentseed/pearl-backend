import websockets
import logging
import json

LOGGER = logging.getLogger("server")


class Router():
    def __init__(self, uri):
        self.msg = dict()
        self.act = dict()
        self.uri = uri
        self.websocket = None

    def terminate(self):
        ### Terminate the instance
        print("Terminate Instance")

    def on_msg(self, path, fn):
        self.msg[path] = fn

    def on_act(self, path, fn):
        self.act[path] = fn

    async def open(self):
        self.websocket = await websockets.connect(self.uri)
        LOGGER.info("ok - WebSocket Connection Initialized")

        while True:
            try:
                if not self.websocket.open:
                    LOGGER.warning("ok - websocket disconnected, attempting reconnection")
                    break

                msg = await self.websocket.recv()
                msg = json.loads(msg)

            except Exception as e:
                LOGGER.error("not ok - failed to decode websocket message")
                LOGGER.error(e)
                continue

            if msg.get('message') is not None:
                message = msg.get('message')
                LOGGER.info('ok - message: ' + str(message))

            elif msg.get('action') is not None:
                action = msg.get('action')
                LOGGER.info('ok - action: ' + str(action))


