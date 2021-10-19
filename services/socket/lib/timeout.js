/**
 * @class Timeout
 */
class Timeout {
    constructor(config, pool) {
        this.config = config;
        this.pool = pool;

        const self = this;

        this.timeout = setInterval(() => {
            self.timeoutBeat(self);
        }, this.config.Timeout);
    }

    timeoutBeat(self) {
        self.pool.clients.forEach((ws) => {
            if ((+new Date()) - ws.activity > self.config.Timeout) {
                ws.send(JSON.stringify({
                    action: 'info#timeout'
                }));
                console.error(`ok - ${ws.auth.t === 'admin' ? 'GPU' : 'Client'} #${ws.auth.i}: TIMEOUT`);
                ws.terminate();
            }
        });

        self.pool.gpus.forEach((ws) => {
            if ((+new Date()) - ws.activity > self.config.Timeout) {
                ws.send(JSON.stringify({
                    action: 'instance#terminate'
                }));
                console.error(`ok - ${ws.auth.t === 'admin' ? 'GPU' : 'Client'} #${ws.auth.i}: TIMEOUT`);
            }
        });
    }

    close() {
        clearInterval(this.timeout);
    }
}

module.exports = Timeout;
