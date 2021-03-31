'use strict';

const Charm = require('charm');
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
        postgres: process.env.Postgres || 'postgres://docker:docker@localhost:5433/gis'
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
    const term = new Term();

    return new Promise((resolve, reject) => {
        const state = {
            connected: false,
            progress: false,
            choose: false
        };

        const ws = new WebSocket(SOCKET + `?token=${a.instance.token}`);

        ws.on('open', () => {
            term.log('connection opened');

            if (!argv.interactive) {
                ws.close();
                return resolve();
            }
        });

        ws.on('close', () => {
            term.log();
            term.log('CONNECTION TERMINATED');
            term.log();
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
                } else if (msg.message === 'model#aoi') {
                    term.log(`ok - model#aoi - ${msg.data.name}`);
                    state.progress = new Progress.SingleBar({}, Progress.Presets.shades_classic);
                    state.progress.start(msg.data.total, 0);
                } else if (msg.message === 'model#prediction') {
                    state.progress.update(msg.data.processed);
                } else if (msg.message === 'model#prediction#complete') {
                    state.progress.stop();
                    term.log('ok - model#prediction#complete');
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

class Term {
    constructor() {

        this.max_log = process.stdout.rows - 10;
        this.buffer = new Array(this.max_log).fill('', 0, this.max_log - 1);

        this.charm = Charm();
        this.charm.pipe(process.stdout);
        this.charm.reset();
        this.charm.write('┏' + '━'.repeat(process.stdout.columns - 2) + '┓');
        this.line(this.max_log)
        this.charm.write('┣' + '━'.repeat(process.stdout.columns - 2) + '┫');
        this.prog();
        this.charm.write('┣' + '━'.repeat(process.stdout.columns - 2) + '┫');
        this.line(5)
        this.charm.write('┗' + '━'.repeat(process.stdout.columns - 2) + '┛');
    }

    log(line) {
        const lines = line.split('\n');
        this.buffer.splice(0, 0, ...lines);
        this.buffer.splice(this.max_log, lines.length);
        this.charm.position(0, 2);
        this.line(this.max_log, this.buffer);
    }

    prog(task) {
        task = task || 'No Ongoing Task'
        this.line(1, [' '.repeat(Math.floor((process.stdout.columns - task.length) / 2)) + 'No Ongoing Task']);
    }

    line(num = 1, lines = []) {
        for (let i = 0; i < num; i++) {
            let line = lines[i] || '';
            this.charm.write('┃ ' + line + ' '.repeat(process.stdout.columns - 4 - line.length) + ' ┃');
        }
    }
}
