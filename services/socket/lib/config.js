'use strict';

/**
 * @class Config
 *
 * @param {Object} args Command Line Arguments
 *
 * @prop {Number} [API='http://localhost:2000'] URL to the main lulc API
 * @prop {Number} [Port=1999] The port on which the WebSocketServer will listen for connections
 * @prop {Number} [Timeout=900000] How long a connection can be silent before it's resources are terminated
 * @prop {Number} [Alive=30000] How often the client must ping/pong to retain an active connection
 */
class Config {
    static async env(args) {
        if (args.prod && !process.env.InstanceSecret) {
            throw new Error('InstanceSecret env var must be set in production environment');
        }

        this.InstanceSecret = process.env.InstanceSecret || 'dev-instance-secret';

        this.API = args.api || process.env.API || 'http://localhost:2000'

        this.Port = args.port || 1999;
        this.Timeout = args.timeout || 15 * 60 * 1000; // default 15m
        this.Alive = args.alive || 30 * 1000; // default 30s

        return this;
    }
}

module.exports = Config;
