const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const test = require('tape');

const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'ws://localhost:1999';

const { connect } = require('./init');
const Worker = require('./worker');

state = connect(test, API);

const worker = new Worker(test, {
    instance: 1
});

worker.start();

test('gpu connection', async (t) => {
    state.connected = false;

    const ws = new WebSocket(SOCKET + `?token=${state.instance.token}`);

    ws.on('open', () => {
        ws.send(JSON.stringify(fs.readFileSync(path.resolve(__dirname, './fixtures/seneca-rocks/model#prediction.json'))));
    });

    ws.on('message', (msg) => {
        console.error(JSON.parse(msg));
    });

    ws.on('close', () => {
        console.error('ENDED');
    });
});
