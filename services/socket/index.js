#! /usr/bin/env node

'use strict';

const express = require('express');
const srv = require('http').createServer();
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Pool = require('./lib/pool');
const argv = require('minimist')(process.argv, {
    boolean: ['prod', 'help']
});

const Timeout = require('./lib/timeout');

const Config = require('./lib/config');
const app = express();

if (require.main === module) {
    if (argv.help) return Config.help();

    configure(argv);
}

const pool = new Pool();

function configure(argv = {}, cb) {
    Config.env(argv).then((config) => {
        return server(argv, config, cb);
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

/**
 * @param {Object} argv
 * @param {Config} config
 * @param {function} cb
 */
function server(argv, config, cb) {
    app.get('/health', (req, res) => {
        return res.json({
            healthy: true,
            message: 'Good to go'
        });
    });

    srv.on('request', app);

    const wss = new WebSocket.Server({
        server: srv,
        verifyClient: (info, cb) => {
            const url = new URL(`http://localhost:${config.Port}` + info.req.url);

            if (!url.searchParams.has('token')) return cb(false, 401, 'Unauthorized');

            jwt.verify(url.searchParams.get('token'), config.SigningSecret, (err, decoded) => {
                if (err || (decoded.t !== 'inst' && decoded.t !== 'admin')) return cb(false, 401, 'Unauthorized');

                info.req.user = decoded;

                return cb(true);
            });
        }
    });

    const timeout = new Timeout(config, wss);

    /*
     * ws.isAlive {boolean} Store whether the connection is still alive
     * ws.activity {Date} Store the timestamp of th last user defined action
     */
    wss.on('connection', (ws) => {
        ws.isAlive = true;
        ws.activity = +new Date();

        Timeout.client(ws);

        ws.on('message', (payload) => {
            console.error(payload);
        });
    });

    srv.listen(config.Port, () => {
        console.error(`ok - running ws://localhost:${config.Port}`);

        if (cb) return cb((cb) => {
            timeout.close();

            srv.close(() => {
                return cb();
            });
        });
    });

}

module.exports = {
    Config,
    configure,
    server
};
