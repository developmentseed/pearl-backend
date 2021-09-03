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

test('gpu connection', (t) => {
    state.connected = false;
    let close = false;

    const ws = new WebSocket(SOCKET + `?token=${state.instance.token}`);

    ws.on('message', (msg) => {
        msg = JSON.parse(msg);

        if (msg.message === 'info#connected') {
            t.ok('Sending model#prediction');
            console.error(fs.readFileSync(path.resolve(__dirname, './fixtures/seneca-rocks/model#prediction.json')));
            ws.send(fs.readFileSync(path.resolve(__dirname, './fixtures/seneca-rocks/model#prediction.json')));
        } else {
            console.error(msg);
        }
    });

    ws.on('error', (err) => {
        t.error(err, 'no errors');
    });

    ws.on('close', () => {
        if (close) {
            t.end();
        } else {
            t.notOk('Failed to satisfy test flow');
            t.end();
        }
    });
});
