import EventEmitter from 'events';
import Charm from 'charm';
import readline from 'readline';
import fs from 'fs';

export class Progress {
    constructor(y, term) {
        this.y = y;
        this.term = term;
        this.update();
    }

    update(task, percent) {
        this.term.charm.position(0, this.y);

        if (!task) {
            task = 'No Ongoing Task';
            this.term.line(1, [
                ' '.repeat(Math.floor((process.stdout.columns - task.length) / 2)) + task
            ]);
            return;
        }

        const pre = task + ' ' + (Math.floor(percent * 100)) + '%: ';
        const bar = '█'.repeat(Math.floor((process.stdout.columns - pre.length - 4) * percent));
        this.term.line(1, [
            pre + bar
        ]);
    }

}


export class Prompt {
    constructor(y, max_prompt, term) {
        this.max_prompt = max_prompt;
        this.y = y;
        this.term = term;
        this.focus = true;

        this.resolve = false;

        this.current = {
            shown: [],
            inp: '',
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
                if (typeof this.current.shown === 'string') {
                    this.resolve(this.current.inp);
                } else {
                    this.term.emit('promp#selection', this.current.shown[this.current.sel], this.current.sel);
                }
            } else if (key.name === 'escape') {
                this.term.emit('promp#escape');
            } else {
                if (typeof this.current.shown === 'string') {
                    if (key.name === 'backspace' && this.current.inp.length) {
                        this.current.inp = this.current.inp.slice(0, this.current.inp.length - 1);
                        this.update();
                    } else {
                        this.current.inp = this.current.inp + key.sequence;
                        this.update();
                    }
                }
            }

        });

        this.update();
    }

    ask(question) {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.current.shown = question;
            this.current.inp = '';
            this.update();
        });
    }

    screen(options) {
        this.current.shown = options.map((o) => {
            if (typeof o === 'string') {
                return {
                    name: o,
                    value: o
                };
            }

            return o;
        });
        this.current.sel = 0;
        this.current.inp = '';
        this.update();
    }

    update() {
        this.term.charm.position(0, this.y);

        if (Array.isArray(this.current.shown)) {
            this.term.line(5, this.current.shown.map((s, i) => {
                if (this.current.sel === i) {
                    return ' '.repeat(Math.floor((process.stdout.columns - s.name.length - 6) / 2)) + ' > ' + s.name + ' < ';
                } else {
                    return ' '.repeat(Math.floor((process.stdout.columns - s.name.length) / 2)) + s.name;
                }
            }).slice(this.current.sel > 3 ? this.current.sel - 2 : 0));
        } else {
            this.term.line(5, []);
            this.term.charm.position(0, this.y);

            const prompt = 'Enter a value for:';
            return this.term.line(3, [
                ' '.repeat(Math.floor((process.stdout.columns - prompt.length) / 2)) + prompt,
                ' '.repeat(Math.floor((process.stdout.columns - this.current.shown.length) / 2)) + this.current.shown,
                ' '.repeat(Math.floor((process.stdout.columns - this.current.inp.length) / 2)) + this.current.inp
            ] );

        }
    }
}


export class Term extends EventEmitter {
    constructor(debug = false) {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);

        super();

        this.debug = debug ? fs.createWriteStream('/tmp/lulc-flow-debug.log') : false;

        this.max_log = process.stdout.rows - 10;
        this.buffer = new Array(this.max_log).fill('', 0, this.max_log - 1);

        process.stdin.on('keypress', (str, key) => {
            if ((key.ctrl && key.name === 'c') || key.name === 'q') {
                process.exit();
            }
            this.emit('keypress', str, key);
        });

        this.charm = Charm();
        this.charm.pipe(process.stdout);
        this.charm.reset();
        this.charm.write('┏' + '━'.repeat(process.stdout.columns - 2) + '┓');
        this.line(this.max_log);
        this.charm.write('┣' + '━'.repeat(process.stdout.columns - 2) + '┫');
        this.prompt = new Prompt(this.max_log + 3, 5, this);
        this.charm.write('┣' + '━'.repeat(process.stdout.columns - 2) + '┫');
        this.prog = new Progress(this.max_log + 9, this);
        this.charm.write('┗' + '━'.repeat(process.stdout.columns - 2) + '┛');

        if (this.debug) {
            this.log('DEBUG: /tmp/lulc-flow-debug.log');
        }
    }

    log(line) {
        if (this.debug) this.debug.write(line + '\n');

        const lines = line.split('\n');
        this.buffer.splice(this.buffer.length, 0, ...lines);
        this.buffer.splice(0, lines.length);
        this.charm.position(0, 2);
        this.line(this.max_log, this.buffer);
    }

    line(num = 1, lines = []) {
        for (let i = 0; i < num; i++) {
            const line = lines[i] || '';

            let formattedline = line.substring(0, process.stdout.columns - 8);
            if (line.length >= process.stdout.columns - 8) formattedline = formattedline + '...';
            this.charm.write('┃ ' + formattedline + ' '.repeat(process.stdout.columns - 4 - formattedline.length) + ' ┃');
        }
    }
}
