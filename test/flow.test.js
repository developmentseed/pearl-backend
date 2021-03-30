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
    await gpu();
    t.end();
});

async function gpu(t) {
    return new Promise((resolve, reject) => {
        const state = {
            connected: false,
            progress: false,
            choose: false
        };

        const ws = new WebSocket(SOCKET + `?token=${a.instance.token}`);

        ws.on('open', () => {
            console.log('connection opened');

            if (!argv.interactive) {
                ws.close();
                return resolve();
            }
        });

        ws.on('close', () => {
            console.error('CONNECTION TERMINATED');
            process.exit(1)
        });

        if (argv.interactive) {
            ws.on('message', async (msg) => {
                msg = JSON.parse(msg);
                if (argv.debug) console.error(JSON.stringify(msg, null, 4));

                if (msg.message === 'info#connected') {
                    console.log('ok - GPU Connected');
                    state.connected = true;
                } else if (msg.message === 'info#disconnected') {
                    console.log('ok - GPU Disconnected');
                    state.connected = false;
                } else if (msg.message === 'model#aoi') {
                    console.log(`ok - model#aoi - ${msg.data.name}`);
                    state.progress = new Progress.SingleBar({}, Progress.Presets.shades_classic);
                    state.progress.start(msg.data.total, 0);
                } else if (msg.message === 'model#prediction') {
                    state.progress.update(msg.data.processed);
                } else if (msg.message === 'model#prediction#complete') {
                    state.progress.stop();
                    console.log('ok - model#prediction#complete');
                    state.progress = false;
                }

                if (state.connected && !state.progress && !state.choose) {
                    choose(state, ws);
                }
            });
        }
    });
}

async function choose(state, ws) {
    state.choose = true;

    console.log();
    let msg = await inquire.prompt([{
        name: 'type',
        message: 'Type of action to perform',
        type: 'list',
        required: true,
        choices: ['websocket', 'api']
    }]);

    if (msg.type === 'websocket') {
        let choices = ['Custom'];

        if (state.connected) {
            choices = choices.concat(fs.readdirSync(path.resolve(__dirname, './fixtures/')).map((f) => {
                return f.replace(/.json/, '');
            }));
        }

        msg = await inquire.prompt([{
            name: 'message',
            message: 'Message to run',
            type: 'list',
            required: true,
            choices: choices
        }]);

        if (msg.message === 'Custom') {
            msg = await inquire.prompt([{
                name: 'message',
                message: 'Custom JSON Message',
                type: 'string',
                required: true
            }]);

            state.progress = true;
            ws.send(msg.message);
        } else {
            state.progress = true;
            ws.send(String(fs.readFileSync(path.resolve(__dirname, './fixtures', msg.message + '.json'))));
        }
    } else {
        console.log('ok - not API actions currently set up');
    }

    state.choose = false;
}
