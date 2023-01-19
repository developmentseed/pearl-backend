import { Term } from './lib/term.js';
import WebSocket from 'ws';
import test from 'tape';
import path from 'path';
import fs from 'fs';
import LULC from './lib.js';
import minimist from 'minimist';

const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'ws://localhost:1999';

import { connect, reconnect } from './init.js';

const argv = minimist(process.argv, {
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
    state.connected = false;

    const ws = new WebSocket(SOCKET + `?token=${state.instance.token}`);
    const term = new Term(argv.debug);
    const lulc = new LULC({
        token: state.token
    });

    term.log(`TOKEN: ${state.token}`);

    term.prompt.screen(['websockets', 'api']);
    term.on('promp#selection', async (sel) => {
        if (sel.value === 'websockets' || (sel.stats && sel.stats.isDirectory())) {
            const dir = sel.stats ? sel.value : new URL('./fixtures/', import.meta.url);

            term.prompt.screen(fs.readdirSync(dir).map((f) => {
                const stats = fs.statSync(dir + f);

                return {
                    name: (stats.isDirectory() ? '*' : '') + path.parse(f).name,
                    stats: stats,
                    value: path.resolve(dir, f)
                };
            }));
            return;
        } else if (sel.stats && sel.stats.isFile()) {
            ws.send(String(fs.readFileSync(sel.value)));
            term.log(`SENT: ${sel.value}`);
        } else if (sel.value === 'api') {
            term.prompt.screen(Object.keys(lulc.schema.cli).map((k) => {
                return { name: k, value: `api#${k}` };
            }));
            return;
        } else if (sel.value.split('#')[0] === 'api' && sel.value.split('#').length === 2) {
            term.prompt.screen(Object.keys(lulc.schema.cli[sel.value.split('#')[1]]).map((k) => {
                return { name: k, value: `api#${sel.value.split('#')[1]}#${k}` };
            }));
            return;
        } else if (sel.value.split('#')[0] === 'api' && sel.value.split('#').length === 3) {
            const url = lulc.schema.cli[sel.value.split('#')[1]][sel.value.split('#')[2]];
            const matches = url.match(/:[a-z]+/g);

            const inp = {
                ':projectid': 1
            };

            if (lulc.schema.schema[url].body) {
                const data = await lulc.cmd('schema', 'list', {
                    '?method': url.split(' ')[0],
                    '?url': url.split(' ')[1]
                });

                const res = await term.prompt.ask('Read body from file? (Y/n)');
                if (!res || res.toLowerCase() === 'y') {
                    const f = await term.prompt.ask('File Path');

                    Object.assign(inp, JSON.parse(fs.readFileSync(path.resolve(f))));

                } else {
                    if (data.body && data.body.type === 'object') {
                        for (const match of Object.keys(data.body.properties)) {
                            if (inp[match]) continue;
                            inp[match] = await term.prompt.ask(match);

                            if (data.body.properties[match].type === 'integer') inp[match] = parseInt(inp[match]);
                            if (data.body.properties[match].type === 'number') inp[match] = Number(inp[match]);
                            if (data.body.properties[match].type === 'object') inp[match] = JSON.parse(inp[match]);
                            if (data.body.properties[match].type === 'array') inp[match] = JSON.parse(inp[match]);
                        }
                    }
                }
            }

            if (matches) {
                for (const match of matches) {
                    if (inp[match]) continue;
                    inp[match] = await term.prompt.ask(match);
                }
            }

            try {
                const outp = path.resolve('/tmp/', 'api-output');
                const out = fs.createWriteStream(outp).on('close', () => {
                    try {
                        term.log(JSON.stringify(JSON.parse(fs.readFileSync(outp)), null, 4));
                    } catch (err) {
                        term.log(`Downloaded: ${outp}`);
                    }
                });

                lulc.cmd(
                    sel.value.split('#')[1],
                    sel.value.split('#')[2],
                    inp,
                    out
                );

                term.log(`API: ${sel.value.split('#')[1]} ${sel.value.split('#')[2]}`);
            } catch (err) {
                term.log('ERROR: ' + err.message);
            }
        }

        term.prompt.screen(['websockets', 'api']);
    }).on('promp#escape', () => {
        term.prompt.screen(['websockets', 'api']);
    });

    ws.on('open', () => {
        term.log('connection opened');
    });

    ws.on('close', () => {
        term.log('CONNECTION TERMINATED');
    });

    if (argv.interactive) {
        ws.on('message', async (msg) => {
            msg = JSON.parse(String(msg));
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
            } else if (msg.message === 'model#timeframe#progress') {
                term.log(`ok - model#timeframe#progress - ${msg.data.aoi}`);
                term.prog.update('model#timeframe', 0);
            } else if (msg.message === 'model#timeframe#complete') {
                term.log(`ok - model#timeframe#complete - ${msg.data.aoi}`);
                term.prog.update();
            } else if (msg.message === 'model#timeframe') {
                term.log(`ok - model#timeframe - ${msg.data.name} - chkpt: ${msg.data.checkpoint_id}`);
                state.aois.push(msg.data);
                term.prog.update('model#prediction', 0);
            } else if (msg.message === 'model#patch') {
                term.log(`ok - model#patch - ${msg.data.id}`);
                term.prog.update('model#patch', 0);
            } else if (msg.message === 'model#patch#progress') {
                term.prog.update('model#patch', msg.data.processed / msg.data.total);
            } else if (msg.message === 'model#patch#complete') {
                term.log('ok - model#patch#complete');
                term.prog.update();
            } else if (msg.message === 'model#checkpoint') {
                term.log(`ok - model#checkpoint - ${msg.data.name}`);
                state.checkpoints.push(msg.data);
            } else if (msg.message === 'model#prediction') {
                term.prog.update('model#prediction', msg.data.processed / msg.data.total);
            } else if (msg.message === 'model#prediction#complete') {
                term.log(`ok - model#prediction#complete - ${msg.data.aoi}`);
                term.prog.update();
            } else if (msg.message === 'model#aborted') {
                term.log('ok - model#aborted');
                term.prog.update();
            } else if (msg.message === 'model#status') {
                term.log(JSON.stringify(msg.data, null, 4));
            } else {
                term.log(JSON.stringify(msg, null, 4));
            }
        });
    }
}
