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
const path = require('path');
const WebSocket = require('ws');
const test = require('tape');
const request = require('request');
const { Pool } = require('pg');

const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'http://localhost:1999';

const { Client } = require('pg');
const drop = require('../services/api/test/drop');

let token, instance;

process.env.Postgres = process.env.Postgres || 'postgres://docker:docker@localhost:5433/gis';

test('pre-run', async (t) => {
    try {
        const config = await drop();

        const pool = new Pool({
            connectionString: config.Postgres
        });

        await pool.query(String(fs.readFileSync(path.resolve(__dirname, '../services/api/schema.sql'))));

        const auth = new (require('../services/api/lib/auth').Auth)(pool);
        const authtoken = new (require('../services/api/lib/auth').AuthToken)(pool, config);

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

        pool.end();
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
            limits: { live_inference: 1000, max_inference: 100000 }
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
                { name: 'Imprervious Surface', color: '#ffb703' },
                { name: 'Imprevious Road', color: '#0218a2' }
            ],
            meta: {}
        },
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(Object.keys(body), [
            'id', 'created', 'active', 'uid', 'name', 'model_type', 'model_inputshape', 'model_zoom', 'storage', 'classes', 'meta'
        ], 'expected props');

        t.ok(parseInt(body.id), 'id: <integer>');

        delete body.created;
        delete body.id;

        t.deepEquals(body, {
            active: true,
            uid: 1,
            name: 'NAIP Supervised',
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
                { name: 'Imprervious Surface', color: '#ffb703' },
                { name: 'Imprevious Road', color: '#0218a2' }
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
            'created', 'id', 'model_id', 'mosaic', 'name'
        ], 'expected props');

        t.ok(body.created, 'created: <date>');

        delete body.created;

        t.deepEquals(body, {
            id: 1,
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
            'created', 'id', 'token'
        ], 'expected props');

        t.ok(parseInt(body.id), 'id: <integer>');

        delete body.id,
        delete body.created;

        instance = body.token;

        delete body.token;

        t.deepEquals(body, {}, 'expected body');

        t.end();
    });
});

test('gpu connection', (t) => {
    const ws = new WebSocket(SOCKET + `?token=${instance}`);

    ws.on('open', () => {
        t.ok('connection opened');

        if (!process.env.GPU) {
            ws.close();
            t.end();
        }
    });

    ws.on('message', (msg) => {
        msg = JSON.parse(msg)

        // Messages in this IF queue are in chrono order
        if (msg.message === 'info#connected') {
            ws.send(JSON.stringify({
                action: 'model#prediction',
                data: {
                    polygon: {
                        type: 'Polygon',
                        coordinates: [[
                            [-79.37724530696869, 38.83428180092151],
                            [-79.37677592039108, 38.83428180092151],
                            [-79.37677592039108, 38.83455550411051],
                            [-79.37724530696869, 38.83455550411051],
                            [-79.37724530696869, 38.83428180092151]
                        ]]
                    }
                }
            }));
        } else if (msg.message === 'model#prediction#complete') {
            ws.send(JSON.stringify({
                action: 'model#checkpoint',
                data: {
                    name: 'Test Checkpoint'
                }
            }));
        } else {
            console.error(JSON.stringify(msg, null, 4))
        }
    });
});
