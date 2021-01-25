'use strict';

/**
 * @class Timeout
 */
class Timeout {
    constructor(config, wss) {
        this.config = config;
        this.wss = wss;

        const self = this;

        this.timeout = setInterval(() => {
            self.timeoutBeat(self);
        }, this.config.Timeout);

        this.alive = setInterval(() => {
            self.aliveBeat(self);
        }, this.config.Alive);
    }

    static client(ws) {
        ws.on('pong', () => {
            ws.isAlive = true;
        });
    }

    timeoutBeat(self) {
        self.wss.clients.forEach((ws) => {
            if ((+new Date()) - ws.activity > self.config.Timeout) {
                ws.terminate();
            }
        });
    }

    aliveBeat(self) {
        self.wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();

            ws.isAlive = false;
            ws.ping(() => {});
        });
    }

    close() {
        clearInterval(this.timeout);
        clearInterval(this.alive);
    }
}

module.exports = Timeout;
