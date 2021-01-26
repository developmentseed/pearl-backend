'use strict';

/**
 * @class Pool
 *
 * @prop {Object} gpus instance_id to websocket connection map of GPU instances
 * @prop {Object} clients instance_id to websocket connection map of clients
 */
class Pool {
    constructor() {
        this.gpus = new Map();
        this.clients = new Map();
    }

    /**
     * Add a new connection to the pool
     */
    connected(ws) {
        if (ws.auth.t === 'admin') {
            if (this.gpu(ws.auth.i)) this.gpu(ws.auth.i).terminate();

            this.gpus.set(ws.auth.i, ws);

            if (this.client(ws.auth.i)) {
                this.client(ws.auth.i).send(JSON.stringify({
                    message: 'info#connected'
                }));
            }
        } else if (ws.auth.t === 'inst') {
            if (this.client(ws.auth.i)) this.client(ws.auth.i).terminate();

            this.clients.set(ws.auth.i, ws);

            if (this.client(ws.auth.i)) {
                this.client(ws.auth.i).send(JSON.stringify({
                    message: 'info#connected'
                }));
            }
        }
    }

    disconnected(ws) {
        if (ws.auth.t === 'admin') {
            this.gpus.delete(ws.auth.i);

            if (this.client(ws.auth.i)) {
                this.client(ws.auth.i).send(JSON.stringify({
                    message: 'info#disconnected'
                }));
            }
        } else if (ws.auth.t === 'inst') {
            this.clients.delete(ws.auth.i);

            if (this.client(ws.auth.i)) {
                this.client(ws.auth.i).send(JSON.stringify({
                    message: 'info#disconnected'
                }));
            }
        }
    }

    route(ws, payload) {
        if (ws.auth.t === 'inst') {
            if (!this.gpu(ws.auth.i)) {
                ws.send(JSON.stringify({
                    message: 'error',
                    data: {
                        error: 'Failed to communicate with GPU Instance',
                        detailed: 'No GPU websocket connection currently exists in router. Does the GPU instance exist?'
                    }
                }));
            }

            this.gpu(ws.auth.i).send(payload);
        } else if (ws.auth.t === 'admin') {
            if (!this.client(ws.auth.i)) {
                ws.send(JSON.stringify({
                    message: 'error',
                    data: {
                        error: 'Failed to communicate with Client Instance',
                        detailed: 'No client websocket connection currently exists in router. Try to send the message again if the client connects'
                    }
                }));
            }

            this.client(ws.auth.i).send(payload);
        }
    }

    gpu(instance_id) {
        return this.gpus.get(instance_id);
    }

    client(instance_id) {
        return this.clients.get(instance_id);
    }

    gpus() {
        return this.gpus.values();
    }

    clients() {
        return this.clients.values();
    }
}

module.exports = Pool;
