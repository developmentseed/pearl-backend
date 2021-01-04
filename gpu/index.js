const WebSocket = require('ws');
const express = require('express');
const argv = require('minimist')(process.argv, {
    boolean: ['dev']
});

const PORT = 2000;

if (require.main === module) {
    return server();
}

/**
 * @param {Object} args
 * @param {Config} config
 * @param {function} cb
 */
async function server(args, config, cb) {
    const wss = new WebSocket.Server({
        port: PORT,
    });

    wss.on('connection', (ws) => {
        ws.on('message', (data) => {
            console.error(data);
        });
    });

    console.error(`ok - running ws://localhost:${PORT}`);
}
