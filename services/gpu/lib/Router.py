import websocket
try:
    import thread
except ImportError:
    import _thread as thread

import traceback
import logging
import time
import json

LOGGER = logging.getLogger("server")
websocket.enableTrace(True)

class Socket():
    def __init__(self, uri):
        self.uri = uri
        self.websocket = False
        LOGGER.info("ok - WebSocket Connection Initialized")

    def connect(self, handler):
        self.handler = handler

        try:
            self.websocket = websocket.WebSocketApp(self.uri,
                on_message = self.on_recv,
                on_error = self.on_error,
                on_close = self.on_close
            )

            self.websocket.run_forever()
        except:
            LOGGER.error("not ok - failed to connect - retrying")
            time.sleep(1)
            self.connect()

    def on_error(self, ws, error):
        print(error);

    def on_close(self, ws):
        self.connect(self.handler)

    def on_recv(self, ws, msg):
        try:
            self.handler(json.loads(msg))
        except:
            LOGGER.error("not ok - failed to decode message")
            LOGGER.error(msg)

    def send(self, payload):
        try:
            self.websocket.send(payload)
        except:
            LOGGER.error("not ok - failed to send message")
            LOGGER.error(payload)

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

    def open(self):
        self.websocket.connect(self.message)

    def message(self, msg):
        if msg.get('message') is not None:
            message = msg.get('message')
            LOGGER.info('ok - message: ' + str(message))

            if self.msg.get(message):
                try:
                    thread.start_new_thread(self.msg[message], (msg.get('data', {}), self.websocket))
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
                    thread.start_new_thread(self.act[action], (msg.get('data', {}), self.websocket))
                except Exception as e:
                    LOGGER.error("not ok - failed to process: " + action)
                    LOGGER.error("Error: {0}".format(e))
                    traceback.print_exc()
            elif action == "instance#terminate":
                self.websocket.terminate()
            else:
                LOGGER.info('ok - Unknown Action: {}'.format(json.dumps(msg)))

