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
function server(argv, config, cb) {
    const wss = new WebSocket.Server({
        port: config.Port
    });

    wss.on('connection', (ws) => {
        ws.on('message', async (payload) => {
            await router(payload);
        });
    });

    console.error(`ok - running ws://localhost:${config.Port}`);

    return cb(wss);
}

async function router(payload) {
    const action = payload.action.split(':')[0];

    if (action === 'auth') {
    }
}

module.exports = {
    Config,
    configure,
    server
};
