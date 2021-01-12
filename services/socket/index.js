#! /usr/bin/env node

'use strict';

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const argv = require('minimist')(process.argv, {
    boolean: ['prod']
});

const Config = require('./lib/config');

if (require.main === module) {
    configure(argv);
}

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
    const wss = new WebSocket.Server({
        port: config.Port,
        verifyClient: (info, cb) => {
            const url = new URL(`http://localhost:${config.Port}` + info.req.url);

            if (!url.searchParams.has('token')) return cb(false, 401, 'Unauthorized');

            jwt.verify(url.searchParams.get('token'), config.InstanceSecret, (err, decoded) => {
                if (err) return cb(false, 401, 'Unauthorized');

                info.req.user = decoded;

                return cb(true);
            });
        }
    });

    wss.on('connection', (ws) => {
        ws.isAlive = true;

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('message', (payload) => {
            console.error(payload);
        });
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();

            ws.isAlive = false;
            ws.ping(() => {});
        });
    }, 30000);

    console.error(`ok - running ws://localhost:${config.Port}`);

    if (cb) return cb((cb) => {
        clearInterval(interval);

        wss.close(() => {
            return cb();
        });
    });
}

module.exports = {
    Config,
    configure,
    server
};
