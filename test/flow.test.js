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
                action: 'model#retrain',
                data: {
                    "type": "FeatureCollection",
                    "features": [
                        { "type": "Feature", "properties": { "class": 'Structure' }, "geometry": { "type": "Point", "coordinates": [-79.376936712501418, 38.834394753436762] } },
                        { "type": "Feature", "properties": { "class": 'Structure' }, "geometry": { "type": "Point", "coordinates": [-79.377090146278206, 38.834530999727654] } },
                        { "type": "Feature", "properties": { "class": 'Water' }, "geometry": { "type": "Point", "coordinates": [-79.37696804261671, 38.834380908318451] } },
                        { "type": "Feature", "properties": { "class": 'Water' }, "geometry": { "type": "Point", "coordinates": [-79.377184066049367, 38.834321175495617] } },
                        { "type": "Feature", "properties": { "class": 'No Data' }, "geometry": { "type": "Point", "coordinates": [-79.377054334995179, 38.834430418523333] } },
                        { "type": "Feature", "properties": { "class": 'Imprevious Road' }, "geometry": { "type": "Point", "coordinates": [-79.377173465020022, 38.834299523357863] } },
                        { "type": "Feature", "properties": { "class": 'Imprevious Road' }, "geometry": { "type": "Point", "coordinates": [-79.376966596942438, 38.834323695161871] } },
                        { "type": "Feature", "properties": { "class": 'Emergent Wetlands' }, "geometry": { "type": "Point", "coordinates": [-79.37693751489175, 38.834455284388312] } },
                        { "type": "Feature", "properties": { "class": 'Imprervious Surface' }, "geometry": { "type": "Point", "coordinates": [-79.376836609778778, 38.834442041615475] } },
                        { "type": "Feature", "properties": { "class": 'Imprervious Surface' }, "geometry": { "type": "Point", "coordinates": [-79.376948437562518, 38.834433152757917] } },
                        { "type": "Feature", "properties": { "class": 'Imprervious Surface' }, "geometry": { "type": "Point", "coordinates": [-79.376910948390474, 38.834417625757332] } },
                        { "type": "Feature", "properties": { "class": 'Tree Canopy' }, "geometry": { "type": "Point", "coordinates": [-79.377115299643052, 38.834525768732178] } },
                        { "type": "Feature", "properties": { "class": 'Tree Canopy' }, "geometry": { "type": "Point", "coordinates": [-79.377060944876419, 38.834393055366228] } },
                        { "type": "Feature", "properties": { "class": 'Shrubland' }, "geometry": { "type": "Point", "coordinates": [-79.376997929836634, 38.834476753022301] } },
                        { "type": "Feature", "properties": { "class": 'Shrubland' }, "geometry": { "type": "Point", "coordinates": [-79.376993520578864, 38.834320148825498] } },
                        { "type": "Feature", "properties": { "class": 'Barren' }, "geometry": { "type": "Point", "coordinates": [-79.376950679117911, 38.834398686286974] } },
                        { "type": "Feature", "properties": { "class": 'Barren' }, "geometry": { "type": "Point", "coordinates": [-79.377184762372309, 38.834317436038809] } },
                        { "type": "Feature", "properties": { "class": 'Low Vegetation' }, "geometry": { "type": "Point", "coordinates": [-79.376824957802995, 38.834323027184489] } },
                        { "type": "Feature", "properties": { "class": 'Tundra' }, "geometry": { "type": "Point", "coordinates": [-79.377064851017821, 38.834368202090261] } },
                        { "type": "Feature", "properties": { "class": 'Tundra' }, "geometry": { "type": "Point", "coordinates": [-79.37707642397551, 38.834321754940582] } }
                    ]
                }
            }));
        } else if (msg.message === 'model#retrain#complete') {
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
