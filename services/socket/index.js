#! /usr/bin/env node

import express from 'express';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import Pool from './lib/pool.js';
import minimist from 'minimist';

const argv = minimist(process.argv, {
    boolean: ['prod', 'help', 'debug']
});

import Timeout from './lib/timeout.js';
import Config from './lib/config.js';

const app = express();

if (require.main === module) {
    if (argv.help) return Config.help();

    configure(argv);
}

export async function configure(argv = {}, cb) {
    try {
        const config = await Config.env(argv);
        return server(argv, config, cb);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

/**
 * @param {Object} argv
 * @param {Config} config
 * @param {function} cb
 */
export async function server(argv, config, cb) {
    const pool = new Pool(config, argv);

    app.get('/health', (req, res) => {
        return res.json({
            healthy: true,
            message: 'Good to go'
        });
    });

    await config.api.deactivate();

    const srv = require('http').createServer();
    srv.timeout = 0;
    srv.keepAliveTimeout = 0;
    srv.on('request', app);

    const wss = new WebSocket.Server({
        noServer: true,
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

    srv.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });

    const timeout = new Timeout(config, pool);

    wss.on('connection', (ws, req) => {
        ws.auth = req.auth;
        pool.connected(ws);

        ws.on('close', () => {
            pool.disconnected(ws);
        });

        ws.on('message', (payload) => {
            payload = String(payload);

            if (payload.split('#')[0] === 'ping') return ws.send(`pong#${payload.split('#')[1]}`);

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
