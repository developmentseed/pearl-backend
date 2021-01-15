class Pool {
    constructor() {
        this.gpus = { };
        this.clients = { };
    }

    gpu(instance_id) {
        return this.gpus[intsance_id];
    }

    client(instance_id) {
        return this.clients[intsance_id];
    }

    gpus() {
        return this.gpus.values();
    }

    clients() {
        return this.clients.values();
    }
}

module.exports = Pool;
