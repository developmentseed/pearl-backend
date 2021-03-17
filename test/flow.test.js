'use strict';

//
// Note: Docker-Compose must be running
//
// Test the following authentication flow between services
//
// - Create new user
// - Create new token
// - Authenticate with WS router
//

const fs = require('fs');
const Progress = require('cli-progress');
const path = require('path');
const WebSocket = require('ws');
const test = require('tape');
const request = require('request');
const { Pool } = require('pg');
const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'http://localhost:1999';
const Knex = require('knex');

const { Client } = require('pg');
const drop = require('../services/api/test/drop');
const KnexConfig = require('../services/api/knexfile');

let token, instance;

process.env.Postgres = process.env.Postgres || 'postgres://docker:docker@localhost:5433/gis';

test('pre-run', async (t) => {
    try {
        const config = await drop();

        KnexConfig.connection = config.Postgres;
        const knex = Knex(KnexConfig);
        await knex.migrate.latest();

        const auth = new (require('../services/api/lib/auth').Auth)(config);
        const authtoken = new (require('../services/api/lib/auth').AuthToken)(config);

        const user = await auth.create({
            access: 'admin',
            username: 'example',
            email: 'example@example.com',
            auth0Id: 0
        });

        token = (await authtoken.generate({
            type: 'auth0',
            uid: 1
        }, 'API Token')).token;

        await knex.destroy()
        config.pool.end();
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('api running', (t) => {
    request({
        method: 'GET',
        json: true,
        url: API + '/api'
    }, (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200);

        t.deepEquals(body, {
            version: '1.0.0',
            limits: {
                live_inference: 1000,
                max_inference: 100000,
                instance_window: 1800
            }
        });

        t.end();
    });
});

test('new model', (t) => {
    request({
        method: 'POST',
        json: true,
        url: API + '/api/model',
        body: {
            name: 'NAIP Supervised',
            active: true,
            model_type: 'pytorch_example',
            model_inputshape: [256, 256, 4],
            model_zoom: 17,
            classes: [
                { name: 'No Data', color: '#62a092' },
                { name: 'Water', color: '#0000FF' },
                { name: 'Emergent Wetlands', color: '#008000' },
                { name: 'Tree Canopy', color: '#80FF80' },
                { name: 'Shrubland', color: '#806060' },
                { name: 'Low Vegetation', color: '#07c4c5' },
                { name: 'Barren', color: '#027fdc' },
                { name: 'Structure', color: '#f76f73' },
                { name: 'Impervious Surface', color: '#ffb703' },
                { name: 'Impervious Road', color: '#0218a2' }
            ],
            meta: {}
        },
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(Object.keys(body).sort(), [
            'id', 'bounds', 'created', 'active', 'uid', 'name', 'model_type', 'model_inputshape', 'model_zoom', 'storage', 'classes', 'meta'
        ].sort(), 'expected props');

        t.ok(parseInt(body.id), 'id: <integer>');

        delete body.created;
        delete body.id;

        t.deepEquals(body, {
            active: true,
            uid: 1,
            name: 'NAIP Supervised',
            bounds: [-180, -90, 180, 90],
            model_type: 'pytorch_example',
            model_inputshape: [256, 256, 4],
            model_zoom: 17,
            storage: null,
            classes: [
                { name: 'No Data', color: '#62a092' },
                { name: 'Water', color: '#0000FF' },
                { name: 'Emergent Wetlands', color: '#008000' },
                { name: 'Tree Canopy', color: '#80FF80' },
                { name: 'Shrubland', color: '#806060' },
                { name: 'Low Vegetation', color: '#07c4c5' },
                { name: 'Barren', color: '#027fdc' },
                { name: 'Structure', color: '#f76f73' },
                { name: 'Impervious Surface', color: '#ffb703' },
                { name: 'Impervious Road', color: '#0218a2' }
            ],
            meta: {}
        }, 'expected body');

        t.end();
    });
});

test('new model - storage: true', (t) => {
    request({
        method: 'PATCH',
        json: true,
        url: API + '/api/model/1',
        body: {
            storage: true
        },
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(Object.keys(body).sort(), [
            'id', 'bounds', 'created', 'active', 'uid', 'name', 'model_type', 'model_inputshape', 'model_zoom', 'storage', 'classes', 'meta'
        ].sort(), 'expected props');

        t.ok(parseInt(body.id), 'id: <integer>');

        delete body.created;
        delete body.id;

        t.deepEquals(body, {
            active: true,
            uid: 1,
            name: 'NAIP Supervised',
            bounds: [-180, -90, 180, 90],
            model_type: 'pytorch_example',
            model_inputshape: [256, 256, 4],
            model_zoom: 17,
            storage: true,
            classes: [
                { name: 'No Data', color: '#62a092' },
                { name: 'Water', color: '#0000FF' },
                { name: 'Emergent Wetlands', color: '#008000' },
                { name: 'Tree Canopy', color: '#80FF80' },
                { name: 'Shrubland', color: '#806060' },
                { name: 'Low Vegetation', color: '#07c4c5' },
                { name: 'Barren', color: '#027fdc' },
                { name: 'Structure', color: '#f76f73' },
                { name: 'Impervious Surface', color: '#ffb703' },
                { name: 'Impervious Road', color: '#0218a2' }
            ],
            meta: {}
        }, 'expected body');

        t.end();
    });
});

test('new project', (t) => {
    request({
        method: 'POST',
        json: true,
        url: API + '/api/project',
        body: {
            name: 'Test Project',
            model_id: 1,
            mosaic: 'naip.latest'
        },
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(Object.keys(body).sort(), [
            'created', 'id', 'model_id', 'mosaic', 'name', 'uid'
        ], 'expected props');

        t.ok(body.created, 'created: <date>');

        delete body.created;

        t.deepEquals(body, {
            id: 1,
            uid: 1,
            name: 'Test Project',
            model_id: 1,
            mosaic: 'naip.latest'
        }, 'expected body');

        t.end();
    });
});

test('new instance', (t) => {
    request({
        method: 'POST',
        json: true,
        url: API + '/api/project/1/instance',
        body: {},
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(Object.keys(body).sort(), [
            'active', 'aoi_id', 'checkpoint_id', 'created', 'id', 'last_update', 'pod', 'project_id', 'token'
        ].sort(), 'expected props');

        t.ok(parseInt(body.id), 'id: <integer>');

        delete body.id,
        delete body.created;
        delete body.last_update;

        instance = body.token;

        delete body.token;

        t.deepEquals(body, {
            project_id: 1,
            aoi_id: null,
            checkpoint_id: null,
            active: false,
            pod: {}
        }, 'expected body');

        t.end();
    });
});

test('gpu connection', (t) => {

    const state = {
        task: false,
        progress: false
    }

    const ws = new WebSocket(SOCKET + `?token=${instance}`);

    ws.on('open', () => {
        t.ok('connection opened');

        if (!process.env.GPU) {
            ws.close();
            t.end();
        }
    });

    let first = true;

    ws.on('message', (msg) => {
        msg = JSON.parse(msg)

        // Messages in this IF queue are in chrono order
        if (msg.message === 'info#connected') {
            console.error('ok - info#connected');
            first = true;

            ws.send(JSON.stringify({
                action: 'model#prediction',
                data: require('./fixtures/pred.json')
            }));
        } else if (msg.message === 'model#prediction') {
            if (state.task !== msg.message) {
                state.task = msg.message;
                state.progress = new Progress.SingleBar({}, Progress.Presets.shades_classic)

                console.error('ok - model#prediction');
                state.progress.start(msg.data.total, msg.data.processed);
            } else {
                state.progress.update(msg.data.processed);
            }
        } else if (msg.message === 'model#prediction#complete') {
            if (state.progress) state.progress.stop();
            console.error('ok - model#prediction#complete');

            if (first) {
                first = false;
                ws.send(JSON.stringify({
                    action: 'model#retrain',
                    data: require('./fixtures/retrain.json')
                }));
            }
        } else if (msg.message === 'model#retrain#complete') {
            console.error('ok - model#retrain#complete');
        } else if (msg.message === 'model#checkpoint') {
            console.error(`ok - created checkpoint #${msg.data.id}: ${msg.data.name}`);
        } else {
            console.error(JSON.stringify(msg, null, 4))
        }

        state.task = msg.message;
    });
});
