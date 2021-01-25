class Pool {
    constructor() {
        this.gpus = { };
        this.clients = { };
    }

    /**
     * Add a new connection to the pool
     */
    connected(ws) {
        if (ws.auth.u === 'admin') {
            if (this.gpu(ws.auth.i)) this.gpu(ws.auth.i).terminate();

            this.gpus[ws.auth.i] = ws;

            if (this.client(ws.auth.i)) {
                this.client(ws.auth.i).send({
                    message: 'info#connected'
                });
            }
        } else if (ws.auth.u === 'inst') {
            if (this.client(ws.auth.i)) this.client(ws.auth.i).terminate();

            this.clients[ws.auth.i] = ws;

            if (this.client(ws.auth.i)) {
                this.client(ws.auth.i).send({
                    message: 'info#connected'
                });
            }
        }
    }

    disconnected(ws) {
        if (ws.auth.u === 'admin') {
            delete this.gpus[ws.auth.i];

            if (this.client(ws.auth.i) {
                this.client(ws.auth.i).send({
                    message: 'info#disconnected'
                });
            }
        } else if (ws.auth.u === 'inst') {
            delete this.clients[ws.auth.i];

            if (this.client(ws.auth.i) {
                this.client(ws.auth.i).send({
                    message: 'info#disconnected'
                });
            }
        }
    }

    route(ws, payload) {
        if (ws.auth.t === 'inst') {
            if (!this.gpu(ws.auth.i)) {
                ws.send({
                    message: 'error',
                    data: {
                        error: 'Failed to communicate with GPU Instance',
                        detailed: 'No GPU websocket connection currently exists in router. Does the GPU instance exist?'
                    }
                });
            }
        } else if (ws.auth.t === 'admin') {
            if (!this.gpu(ws.auth.i)) {
                ws.send({
                    message: 'error',
                    data: {
                        error: 'Failed to communicate with Client Instance',
                        detailed: 'No client websocket connection currently exists in router. Try to send the message again if a client connects'
                    }
                });
            }
        }
    }

    gpu(instance_id) {
        return this.gpus[intsance_id];
    }

    client(instance_id) {
        return this.clients[instance_id];
    }

    gpus() {
        return this.gpus.values();
    }

    clients() {
        return this.clients.values();
    }
}

module.exports = Pool;
