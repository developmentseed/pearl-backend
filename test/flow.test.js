'use strict';

const Progress = require('cli-progress');
const WebSocket = require('ws');
const test = require('tape');
const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'http://localhost:1999';
const inquire = require('inquirer');

const drop = require('../services/api/test/drop');
const {connect, reconnect} = require('./init');

const argv = require('minimist')(process.argv, {
    string: ['postgres'],
    boolean: ['interactive', 'debug', 'reconnect'],
    alias: {
        interactive: 'i'
    },
    default: {
        postgres: 'postgres://docker:docker@localhost:5433/gis'
    }
});

process.env.Postgres = argv.postgres;

let a;
if (argv.reconnect) {
    a = reconnect(test, API);
} else {
    a = connect(test, API);
}

test('gpu connection', async (t) => {
    await gpu(t);
    t.end();
});

async function gpu(t) {
    return new Promise((resolve, reject) => {
        const state = {
            task: false,
            connected: false,
            progress: false
        };

        const ws = new WebSocket(SOCKET + `?token=${a.instance.token}`);

        ws.on('open', () => {
            t.pass('connection opened');
            if (!argv.gpu) {
                ws.close();
                return resolve();
            }
        });

        ws.on('message', (msg) => {
            msg = JSON.parse(msg);
            if (argv.debug) console.error(JSON.stringify(msg, null, 4));

            if (msg.message === 'info#connected') {
                t.pass('GPU Connected');
                state.connected = true;
            } else if (msg.message === 'info#disconnected') {
                t.pass('GPU Disconnected');
                state.connected = false;
            }
        });
    });
}
