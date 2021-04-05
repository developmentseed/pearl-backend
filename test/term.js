'use strict';

const EventEmitter = require('events');
const Charm = require('charm');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

class Term extends EventEmitter {
    constructor() {
        super();

        this.max_log = process.stdout.rows - 10;
        this.buffer = new Array(this.max_log).fill('', 0, this.max_log - 1);

        process.stdin.on('keypress', (str, key) => {
            if ((key.ctrl && key.name === 'c') || key.name === 'q') {
                process.exit();
            }
            this.emit('keypress', str, key)
        });

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
        this.buffer.splice(this.buffer.length, 0, ...lines);
        this.buffer.splice(0, lines.length);
        this.charm.position(0, 2);
        this.line(this.max_log, this.buffer);
    }

    line(num = 1, lines = []) {
        for (let i = 0; i < num; i++) {
            let line = lines[i] || '';

            let formattedline = line.substring(0, process.stdout.columns - 8);
            if (line.length >= process.stdout.columns - 8) formattedline = formattedline + '...';
            this.charm.write('┃ ' + formattedline + ' '.repeat(process.stdout.columns - 4 - formattedline.length) + ' ┃');
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
        this.focus = true;

        this.websocket = fs.readdirSync(path.resolve(__dirname, './fixtures/')).map((f) => {
            return f.replace(/.json/, '');
        })//.concat(['Custom']);

        this.current = {
            shown: [],
            sel: 0
        };

        process.stdin.on('keypress', (str, key) => {
            if (!this.focus) return;

            if (key.name === 'down') {
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
                this.term.emit('promp#selection', this.current.shown[this.current.sel], this.current.sel);
            } else if (key.name === 'escape') {
                this.term.emit('promp#escape');
            }

        });

        this.update();
    }

    screen(options) {
        this.current.shown = options;
        this.current.sel = 0;
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
        }).slice(this.current.sel > 3 ? this.current.sel - 2 : 0));
    }
}

module.exports = {
    Term
};
