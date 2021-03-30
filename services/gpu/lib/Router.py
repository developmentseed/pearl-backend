import websockets
import traceback
import logging
import json

LOGGER = logging.getLogger("server")

class Socket():
    def __init__(self, uri):
        self.uri = uri
        self.websocket = False
        LOGGER.info("ok - WebSocket Connection Initialized")

    async def ok(self):
        if not self.websocket.open:
            LOGGER.warning("ok - websocket disconnected, attempting reconnection")
            await self.connect()

    async def connect(self):
        try:
            self.websocket = await websockets.connect(self.uri, ping_interval=None)
        except:
            LOGGER.error("not ok - failed to connect - retrying")
            await self.connect()

    async def recv(self):
        try:
            await self.ok()
            msg = await self.websocket.recv()
        except:
            LOGGER.error("not ok - failed to receive message")
            return await self.recv()

        try:
            return json.loads(msg)
        except:
            LOGGER.error("not ok - failed to decode message")
            LOGGER.error(msg)

    async def send(self, payload):
        try:
            await self.ok()
            await self.websocket.send(payload)
        except:
            LOGGER.error("not ok - failed to send message")
            LOGGER.error(payload)
            await self.send(payload)

    def terminate(self):
        exit()

class Router():
    def __init__(self, uri):
        self.msg = dict()
        self.act = dict()
        self.websocket = Socket(uri)

    def on_msg(self, path, fn):
        self.msg[path] = fn

    def on_act(self, path, fn):
        self.act[path] = fn

    async def open(self):
        await self.websocket.connect()

        while True:
            msg = await self.websocket.recv()

            if msg.get('message') is not None:
                message = msg.get('message')
                LOGGER.info('ok - message: ' + str(message))

                if self.msg.get(message):
                    try:
                        await self.msg[message](msg.get('data', {}), self.websocket)
                    except Exception as e:
                        LOGGER.error("not ok - failed to process: " + message)
                        LOGGER.error("Error: {0}".format(e))
                        traceback.print_exc()

                else:
                    LOGGER.info('ok - Unknown Message: {}'.format(json.dumps(msg)))

            elif msg.get('action') is not None:
                action = msg.get('action')
                LOGGER.info('ok - action: ' + str(action))

                if self.act.get(action):
                    try:
                        await self.act[action](msg.get('data', {}), self.websocket)
                    except Exception as e:
                        LOGGER.error("not ok - failed to process: " + action)
                        LOGGER.error("Error: {0}".format(e))
                        traceback.print_exc()
                elif action == "instance#terminate":
                    self.websocket.terminate()
                else:
                    LOGGER.info('ok - Unknown Action: {}'.format(json.dumps(msg)))

