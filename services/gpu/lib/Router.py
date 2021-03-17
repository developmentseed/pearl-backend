import websockets
import traceback
import logging
import json

LOGGER = logging.getLogger("server")


class Router():
    def __init__(self, uri):
        self.msg = dict()
        self.act = dict()
        self.uri = uri
        self.websocket = None

    def on_msg(self, path, fn):
        self.msg[path] = fn

    def on_act(self, path, fn):
        self.act[path] = fn

    async def open(self):
        terminate = False

        while not terminate:
            self.websocket = await websockets.connect(self.uri, ping_interval=None)
            LOGGER.info("ok - WebSocket Connection Initialized")

            while not terminate:
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

                    if self.msg.get(message):
                        try:
                            await self.msg[message](msg.get('data', {}), self.websocket)
                        except Exception as e:
                            LOGGER.error("not ok - failed to process: " + message)
                            LOGGER.error("Error: {0}".format(e))
                            traceback.print_exc()

                    else:
                        LOGGER.info('ok - Unknown Message: {}'.format(msg.get('message')))

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
                        terminate = True
                    else:
                        LOGGER.info('ok - Unknown Action: {}'.format(msg.get('action')))

