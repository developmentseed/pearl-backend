const WebSocket = require('ws');
const test = require('tape');

const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'ws://localhost:1999';
const LULC = require('./lib');

const { connect } = require('./init');
const Worker = require('./worker');

const worker = new Worker(test);

state = connect(test, API);

test('gpu connection', async (t) => {
    state.connected = false;

    const ws = new WebSocket(SOCKET + `?token=${state.instance.token}`);

    const lulc = new LULC({
        token: state.token
    });

    t.end();
});
