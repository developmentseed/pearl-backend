'use strict';

const { Term } = require('./term');
const WebSocket = require('ws');
const test = require('tape');
const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'http://localhost:1999';
const path = require('path');
const fs = require('fs');

const drop = require('../services/api/test/drop');
const {connect, reconnect} = require('./init');

const argv = require('minimist')(process.argv, {
    string: ['postgres'],
    boolean: ['interactive', 'debug', 'reconnect'],
    alias: {
        interactive: 'i'
    },
    default: {
        postgres: process.env.Postgres || 'postgres://docker:docker@localhost:5433/gis'
    }
});

process.env.Postgres = argv.postgres;

let state;
if (argv.reconnect) {
    state = reconnect(test, API);
} else {
    state = connect(test, API);
}

if (argv.interactive) {
    test('gpu connection', async (t) => {
        await gpu();
        t.end();
    });
}

async function gpu() {
    return new Promise((resolve, reject) => {
        state.connected = false;

        const ws = new WebSocket(SOCKET + `?token=${state.instance.token}`);
        const term = new Term(ws, state);

        ws.on('open', () => {
            term.log('connection opened');
        });

        ws.on('close', () => {
            term.log('CONNECTION TERMINATED');
        });

        if (argv.interactive) {
            ws.on('message', async (msg) => {
                msg = JSON.parse(msg);
                if (argv.debug) term.log(JSON.stringify(msg, null, 4));

                if (msg.message === 'info#connected') {
                    term.log('ok - GPU Connected');
                    state.connected = true;
                } else if (msg.message === 'info#disconnected') {
                    term.log('ok - GPU Disconnected');
                    state.connected = false;
                } else if (msg.message === 'model#checkpoint#progress') {
                    term.log(`ok - model#checkpoint#progress - ${msg.data.checkpoint}`);
                    term.prog.update('model#checkpoint', 0);
                } else if (msg.message === 'model#checkpoint#complete') {
                    term.log(`ok - model#checkpoint#complete - ${msg.data.checkpoint}`);
                    term.prog.update();
                } else if (msg.message === 'model#aoi') {
                    term.log(`ok - model#aoi - ${msg.data.name}`);
                    state.aois.push(msg.data);
                    term.prog.update('model#prediction', 0);
                } else if (msg.message === 'model#checkpoint') {
                    term.log(`ok - model#checkpoint - ${msg.data.name}`);
                    state.checkpoints.push(msg.data);
                } else if (msg.message === 'model#prediction') {
                    term.prog.update('model#prediction', msg.data.processed / msg.data.total);
                } else if (msg.message === 'model#prediction#complete') {
                    term.log(`ok - model#prediction#complete - ${msg.data.aoi}`);
                    term.prog.update();
                } else {
                    term.log(JSON.stringify(msg, null, 4));
                }
            });
        }
    });
}
