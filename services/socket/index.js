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

async function configure(argv = {}, cb) {
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
        verifyClient: ({ req }, cb) => {
            const url = new URL(`http://localhost:${config.Port}` + req.url);

            if (!url.searchParams.has('token')) return cb(false, 401, 'Unauthorized');

            jwt.verify(url.searchParams.get('token'), config.SigningSecret, (err, decoded) => {
                if (err || (decoded.t !== 'inst' && decoded.t !== 'admin')) return cb(false, 401, 'Unauthorized');

                req.auth = decoded;

                return cb(true);
            });
        }
    });

    const timeout = new Timeout(config, pool);

    wss.on('connection', (ws, req) => {
        ws.auth = req.auth;

        pool.connected(ws);
        console.error(`ok - ${ws.auth.t === "admin" ? "GPU" : "Client"} instance #${ws.auth.i} connected`);

        Timeout.client(ws);

        ws.on('close', () => {
            console.error(`ok - ${ws.auth.t === "admin" ? "GPU" : "Client"} instance #${ws.auth.i} disconnected`);
            pool.disconnected(ws);
        });

        ws.on('message', (payload) => {
            pool.route(ws, payload);
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
