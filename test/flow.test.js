'use strict';

const Progress = require('cli-progress');
const WebSocket = require('ws');
const test = require('tape');
const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'http://localhost:1999';
const inquire = require('inquirer');
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

            if (!argv.interactive) {
                ws.close();
                return resolve();
            }
        });

        if (argv.interactive) {
            ws.on('message', async (msg) => {
                msg = JSON.parse(msg);
                if (argv.debug) console.error(JSON.stringify(msg, null, 4));

                if (msg.message === 'info#connected') {
                    t.pass('GPU Connected');
                    state.connected = true;
                } else if (msg.message === 'info#disconnected') {
                    t.pass('GPU Disconnected');
                    state.connected = false;
                }

                await choose(state);
            });
        }
    });
}

async function choose(state) {
    let choices = ['No Choice'];
    if (state.connected) {
        choices = choices.concat(fs.readdirSync(path.resolve(__dirname, './fixtures/')).map((f) => {
            return {
                type: 'file',
                name: f.replace(/.json/, '')
            }
        }));
    }

    const msg = await inquire.prompt([{
        name: 'message',
        message: 'Message to run',
        type: 'list',
        required: true,
        choices: choices
    }]);

    if (msg.message.type === 'file') {
        return fs.readFileSync(path.resolve(__dirname, './fixtures', msg.message.name + '.json'));
    }
}
