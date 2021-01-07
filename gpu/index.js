#! /usr/bin/env node

'use strict';

const WebSocket = require('ws');
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
async function server(argv, config, cb) {
    const wss = new WebSocket.Server({
        port: config.Port
    });

    wss.on('connection', (ws) => {
        ws.on('message', (data) => {
            console.error(data);
        });
    });

    console.error(`ok - running ws://localhost:${config.Port}`);
}
