const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const test = require('tape');

const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'ws://localhost:1999';

// Top level tests are only designed to run with docker-compose
process.env.Postgres = process.env.Postgres || 'postgres://docker:docker@localhost:5433/gis';

const { connect } = require('./init');
const Worker = require('./worker');
const Output = require('./output');

Worker.dalek();

const state = connect(test, API);

const worker = new Worker(test, {
    instance: 1
});

worker.start();

test('gpu connection', (t) => {
    state.connected = false;

    const ws = new WebSocket(SOCKET + `?token=${state.instance.token}`);
    const output = new Output(t, './outputs/prediction.test.json');
    let sent = false;

    ws.on('message', (msg) => {
        msg = JSON.parse(String(msg));

        if (msg.message.split('#')[0] !== 'info') {
            try {
                output.compare(msg);
            } catch (err) {
                console.error(JSON.stringify(msg, null, 4));
            }
        }

        if (msg.message === 'info#connected' && !sent) {
            t.ok('Sending: model#prediction (1)');
            ws.send(fs.readFileSync(path.resolve(__dirname, './fixtures/seneca-rocks/model#prediction.json')));
            sent = true;
        } else if (msg.message === 'model#prediction#complete') {
            t.ok('Sending: model#retrain (1)');
            ws.send(fs.readFileSync(path.resolve(__dirname, './fixtures/seneca-rocks/model#retrain.json')));
        }

        if (output.done()) {
            t.ok('Ending Connection');
            ws.close();
        }
    });

    ws.on('error', (err) => {
        t.error(err, 'no errors');
    });

    ws.on('close', () => {
        if (!output.done()) {
            t.notOk('Failed to satisfy test flow');
            t.end();
        } else {
            t.end();
        }
    });
});

worker.stop();
