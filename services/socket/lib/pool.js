'use strict';

/**
 * @class Pool
 *
 * @prop {Object} gpus instance_id to websocket connection map of GPU instances
 * @prop {Object} clients instance_id to websocket connection map of clients
 */
class Pool {
    constructor(config) {
        this.gpus = new Map();
        this.clients = new Map();
        this.config = config;
    }

    /**
     * Add a new connection to the pool
     *
     * @param {Object} ws Websocket Client
     *
     * Set by the connected Function
     * @param {boolean} ws.isAlive Store whether the connection is still alive
     * @param {Date} ws.activity Store the timestamp of the last user defined action
     */
    connected(ws) {
        ws.isAlive = true;
        ws.activity = +new Date();

        if (ws.auth.t === 'admin') {
            this.add_gpu(ws);

            this.config.api.instance_state(ws.auth.p, ws.auth.i, true);

            if (this.has_client(ws.auth.i)) {
                this.gpu(ws.auth.i).send(JSON.stringify({
                    message: 'info#connected'
                }));

                this.client(ws.auth.i).send(JSON.stringify({
                    message: 'info#connected'
                }));
            } else {
                // Notify the GPU that there is no active client
                this.gpu(ws.auth.i).send(JSON.stringify({
                    message: 'info#disconnected'
                }));
            }
        } else if (ws.auth.t === 'inst') {
            if (this.has_client(ws.auth.i)) this.client(ws.auth.i).terminate();

            this.clients.set(ws.auth.i, ws);

            if (this.has_gpu(ws.auth.i)) {
                this.client(ws.auth.i).send(JSON.stringify({
                    message: 'info#connected'
                }));

                this.gpu(ws.auth.i).send(JSON.stringify({
                    message: 'info#connected'
                }));
            } else {
                this.client(ws.auth.i).send(JSON.stringify({
                    message: 'info#disconnected'
                }));
            }
        }
    }

    disconnected(ws) {
        if (ws.auth.t === 'admin') {
            this.gpus.delete(ws.auth.i);

            this.config.api.instance_state(ws.auth.p, ws.auth.i, false);

            if (this.has_client(ws.auth.i)) {
                this.client(ws.auth.i).send(JSON.stringify({
                    message: 'info#disconnected'
                }));
            }
        } else if (ws.auth.t === 'inst') {
            this.clients.delete(ws.auth.i);

            if (this.has_gpu(ws.auth.i)) {
                this.gpu(ws.auth.i).send(JSON.stringify({
                    message: 'info#disconnected'
                }));
            }
        }
    }

    route(ws, payload) {
        ws.activity = +new Date();

        if (ws.auth.t === 'inst') {
            if (!this.has_gpu(ws.auth.i)) {
                return ws.send(JSON.stringify({
                    message: 'error',
                    data: {
                        error: 'Failed to communicate with GPU Instance',
                        detailed: 'No GPU websocket connection currently exists in router. Does the GPU instance exist?'
                    }
                }));
            }

            this.gpu(ws.auth.i).activity = +new Date();
            this.gpu(ws.auth.i).send(payload);
        } else if (ws.auth.t === 'admin') {
            if (!this.has_client(ws.auth.i)) {
                return ws.send(JSON.stringify({
                    message: 'error',
                    data: {
                        error: 'Failed to communicate with Client Instance',
                        detailed: 'No client websocket connection currently exists in router. Try to send the message again if the client connects'
                    }
                }));
            }

            this.client(ws.auth.i).activity = +new Date();
            this.client(ws.auth.i).send(payload);
        }
    }

    add_gpu(ws) {
        if (this.has_gpu(ws.auth.i)) this.gpu(ws.auth.i).terminate();
        this.gpus.set(parseInt(ws.auth.i), ws);
    }

    has_gpu(instance_id) {
        return this.gpus.has(parseInt(instance_id));
    }

    gpu(instance_id) {
        return this.gpus.get(parseInt(instance_id));
    }

    add_client(ws) {
        if (this.has_client(ws.auth.i)) this.client(ws.auth.i).terminate();
        this.clients.set(parseInt(ws.auth.i), ws);
    }

    has_client(instance_id) {
        return this.clients.has(parseInt(instance_id));
    }

    client(instance_id) {
        return this.clients.get(parseInt(instance_id));
    }
}

module.exports = Pool;
