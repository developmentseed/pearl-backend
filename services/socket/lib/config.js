'use strict';

const pkg = require('../package.json');

/**
 * @class Config
 *
 * @prop {Number} [API='http://localhost:2000'] URL to the main lulc API
 * @prop {Number} [Port=1999] The port on which the WebSocketServer will listen for connections
 * @prop {Number} [Timeout=900000] How long a connection can be silent before it's resources are terminated
 * @prop {Number} [Alive=30000] How often the client must ping/pong to retain an active connection
 */
class Config {

    /**
     * Combine cli arguments, environment variables and defaults into a single Config object
     * @param {Object} args Command Line Arguments
     */
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

    static async help() {
        console.error(`lulc/socket@${pkg.version}`);
        console.error();
        console.error('./index.js [--help] [--prod] [--api <api>] [--port <port>] [--timeout <timeout>] [--alive <timeout>]');
        console.error();
        console.error('Options:');
        console.error();
        console.error('  --help                                     Print this message');
        console.error('  --prod [default: false]                    Run in production mode');
        console.error('  --api [default: http://localhost:4000]     The API URL to connect to');
        console.error('  --port [default: 1999]                     The port on which to run');
        console.error('  --timeout [default: 900000]                How long can a session idle');
        console.error('  --alive [default: 30000]                   Heartbeat interval');
        console.error();
        console.error('Environment:');
        console.error('  Note: Environment variables take precedence over cli args');
        console.error();
        console.error('  InstanceSecret [required]                  Shared API string to validate auth tokens');
        console.error('  API                                        The API URL to connect to');
        console.error();
    }
}

module.exports = Config;
