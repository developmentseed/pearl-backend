'use strict';

const Charm = require('charm');
const readline = require('readline');
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

let a;
if (argv.reconnect) {
    a = reconnect(test, API);
} else {
    a = connect(test, API);
}

if (argv.interactive) {
    test('gpu connection', async (t) => {
        await gpu();
        t.end();
    });
}

async function gpu(t) {
    return new Promise((resolve, reject) => {
        const state = {
            connected: false,
            choose: false
        };

        const ws = new WebSocket(SOCKET + `?token=${a.instance.token}`);
        const term = new Term(ws);

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
                } else if (msg.message === 'model#aoi') {
                    term.log(`ok - model#aoi - ${msg.data.name}`);
                    term.prog.update('model#prediction', 0);
                } else if (msg.message === 'model#prediction') {
                    term.prog.update('model#prediction', msg.data.processed / msg.data.total);
                } else if (msg.message === 'model#prediction#complete') {
                    term.prog.update();
                    term.log('ok - model#prediction#complete');
                }
            });
        }
    });
}

class Term {
    constructor(ws) {
        this.ws = ws;
        this.max_log = process.stdout.rows - 10;
        this.buffer = new Array(this.max_log).fill('', 0, this.max_log - 1);

        this.charm = Charm();
        this.charm.pipe(process.stdout);
        this.charm.reset();
        this.charm.write('┏' + '━'.repeat(process.stdout.columns - 2) + '┓');
        this.line(this.max_log)
        this.charm.write('┣' + '━'.repeat(process.stdout.columns - 2) + '┫');
        this.prompt = new Prompt(this.max_log + 3, 5, this);
        this.charm.write('┣' + '━'.repeat(process.stdout.columns - 2) + '┫');
        this.prog = new Progress(this.max_log + 9, this)
        this.charm.write('┗' + '━'.repeat(process.stdout.columns - 2) + '┛');
    }

    log(line) {
        const lines = line.split('\n');
        this.buffer.splice(this.max_log - lines.length + 1, 0, ...lines);
        this.buffer.splice(0, lines.length);
        this.charm.position(0, 2);
        this.line(this.max_log, this.buffer);
    }

    line(num = 1, lines = []) {
        for (let i = 0; i < num; i++) {
            let line = lines[i] || '';
            this.charm.write('┃ ' + line + ' '.repeat(process.stdout.columns - 4 - line.length) + ' ┃');
        }
    }
}

class Progress {
    constructor(y, term) {
        this.y = y;
        this.term = term;
        this.update();
    }

    update(task, percent) {
        this.term.charm.position(0, this.y);

        if (!task) {
            task = 'No Ongoing Task'
            this.term.line(1, [
                ' '.repeat(Math.floor((process.stdout.columns - task.length) / 2)) + task
            ]);
            return;
        }

        let pre = task + ' ' + (Math.floor(percent * 100)) + '%: ';
        let bar = '█'.repeat(Math.floor((process.stdout.columns - pre.length - 4) * percent));
        this.term.line(1, [
            pre + bar
        ]);
    }

}

class Prompt {
    constructor(y, max_prompt, term) {
        this.max_prompt = max_prompt;
        this.y = y;
        this.term = term;

        this.base = ['websocket', 'api'];
        this.websocket = fs.readdirSync(path.resolve(__dirname, './fixtures/')).map((f) => {
            return f.replace(/.json/, '');
        })//.concat(['Custom']);

        this.current = {
            shown: this.base,
            screen: 'base',
            sel: 0
        };

        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'c') {
                process.exit();
            } else if (key.name === 'down') {
                if (this.current.sel < this.current.shown.length - 1) {
                    this.current.sel++;
                }
                this.update();
            } else if (key.name === 'up') {
                if (this.current.sel > 0) {
                    this.current.sel--;
                }
                this.update();
            } else if (key.name === 'return') {
                if (this.current.screen === 'base' && this.current.shown[this.current.sel] === 'websocket') {
                    this.current.screen = 'websocket';
                    this.current.shown = this.websocket;
                    this.current.sel = 0;
                } else if (this.current.screen === 'websocket' && this.current.shown[this.current.sel] !== 'Custom') {
                    this.term.log('<INPUT>: ' + this.current.shown[this.current.sel]);
                    this.term.ws.send(String(fs.readFileSync(path.resolve(__dirname, './fixtures', this.current.shown[this.current.sel] + '.json'))));
                    this.current.screen = 'base';
                    this.current.shown = this.base;
                    this.current.sel = 0;
                }

                this.update();
            } else if (key.name === 'escape') {
                if (['api', 'websocket'].includes(this.current.screen)) {
                    this.current.screen = 'base';
                    this.current.shown = this.base;
                    this.current.sel = 0;

                    this.update();
                }
            }

        });

        this.update();
    }

    update() {
        this.term.charm.position(0, this.y);
        this.term.line(5, this.current.shown.map((s, i) => {
            if (this.current.sel === i) {
                return ' '.repeat(Math.floor((process.stdout.columns - s.length - 6) / 2)) + ' > ' + s + ' < ';
            } else {
                return ' '.repeat(Math.floor((process.stdout.columns - s.length) / 2)) + s;
            }
        }));
    }
}
