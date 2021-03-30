'use strict';

const Progress = require('cli-progress');
const WebSocket = require('ws');
const test = require('tape');
const { promisify } = require('util');
const request = promisify(require('request'));
const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'http://localhost:1999';
const Knex = require('knex');

const drop = require('../services/api/test/drop');
const KnexConfig = require('../services/api/knexfile');
const {connect, reconnect} = require('./init');

const argv = require('minimist')(process.argv, {
    string: ['postgres'],
    boolean: ['gpu', 'debug', 'reconnect'],
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

gpu();

if (!process.env.GPU) return;

test('Instance 2', async (t) => {
    try {
        const res = await request({
            method: 'POST',
            json: true,
            url: API + '/api/project/1/instance',
            body: {
                checkpoint_id: 2,
                aoi_id: 2
            },
            headers: {
                Authorization: `Bearer ${a.token}`
            }
        });

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(Object.keys(res.body).sort(), [
            'active', 'aoi_id', 'checkpoint_id', 'created', 'id', 'last_update', 'pod', 'project_id', 'token'
        ].sort(), 'expected props');

        t.ok(parseInt(res.body.id), 'id: <integer>');

        instance = JSON.parse(JSON.stringify(res.body));

        delete res.body.id,
            delete res.body.created;
        delete res.body.last_update;
        delete res.body.token;

        t.deepEquals(res.body, {
            project_id: 1,
            aoi_id: 2,
            checkpoint_id: 2,
            active: false,
            pod: {}
        }, 'expected body');

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

gpu();

function gpu() {
    test('gpu connection', (t) => {

        const state = {
            task: false,
            progress: false
        };

        const ws = new WebSocket(SOCKET + `?token=${a.instance.token}`);

        ws.on('open', () => {
            t.ok('connection opened');

            if (!argv.gpu) {
                ws.close();
                t.end();
            }
        });

        let runs = 0;

        ws.on('message', (msg) => {
            msg = JSON.parse(msg);
            if (argv.debug) console.error(JSON.stringify(msg, null, 4));

            // Messages in this IF queue are in chrono order
            if (msg.message === 'info#connected') {
                console.error('ok - info#connected');
                if (runs === 0) {
                    ws.send(JSON.stringify({
                        action: 'model#prediction',
                        data: require('./fixtures/pred.json')
                    }));
                }
            } else if (msg.message === 'model#prediction') {
                if (state.task !== msg.message) {
                    state.task = msg.message;
                    state.progress = new Progress.SingleBar({}, Progress.Presets.shades_classic);

                    console.error('ok - model#prediction');
                    state.progress.start(msg.data.total, msg.data.processed);
                } else {
                    state.progress.update(msg.data.processed);
                }
            } else if (msg.message === 'model#prediction#complete') {
                runs++;

                if (state.progress) state.progress.stop();
                console.error('ok - model#prediction#complete');

                if (runs === 1) {
                    ws.send(JSON.stringify({
                        action: 'model#retrain',
                        data: require('./fixtures/retrain.json')
                    }));
                } else if (runs === 2) {
                    if (a.instance.id === 1) {
                        ws.send(JSON.stringify({
                            action: 'model#retrain',
                            data: require('./fixtures/retrain.json')
                        }));
                    }
                } else if (runs === 3) {
                   if (a.instance.id === 1) {
                      ws.send(JSON.stringify({
                          action: 'model#checkpoint',
                          data: {
                              id: 2
                          }
                      }));
                   }
                } else if (runs === 4) {
                    if (a.instance.id === 1) {
                        ws.send(JSON.stringify({
                            action: 'instance#terminate'
                        }));
                        ws.close();
                        t.end();
                    }
                }
            } else if (msg.message === 'model#retrain#complete') {
                console.error('ok - model#retrain#complete');
            } else if (msg.message === 'model#checkpoint') {
                console.error(`ok - created checkpoint #${msg.data.id}: ${msg.data.name}`);
            } else {
                console.error(JSON.stringify(msg, null, 4));
            }

            state.task = msg.message;
        });
    });
}
