class Pool {
    constructor() {
        this.gpus = { };
        this.clients = { };
    }

    /**
     * Add a new connection to the pool
     */
    new(ws, auth) {
        if (auth.u === 'admin') {
            if (this.gpus[auth.i]) this.gpus[auth.i].terminate();

            this.gpus[auth.i] = ws;
        } else if (auth.u === 'inst') {
            if (this.clients[auth.i]) this.clients[auth.i].terminate();

            this.clients[auth.i] = ws;
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
