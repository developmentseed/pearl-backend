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

test('pre-run', async (t) => {
    try {
        const config = await drop();

        const pool = new Pool({
            connectionString: config.Postgres
        });

        await pool.query(String(fs.readFileSync(path.resolve(__dirname, '../services/api/schema.sql'))));

        const auth = new (require('../services/api/lib/auth').Auth)(pool);
        const authtoken = new (require('../services/api/lib/auth').AuthToken)(pool, config);
        const testUser = {
            username: 'example',
            email: 'example@example.com',
            auth0Id: 0
        };

        const user = await auth.create(testUser);
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
    } , (err, res, body) => {
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
            model_type: 'keras_example',
            model_finetunelayer: -4,
            model_numparams: 7790949,
            model_inputshape: [240,240,4],
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            meta: {}
        },
        headers: {
            Authorization: `Bearer ${token}`
        }
    } , (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(Object.keys(body), [
            'id',
            'created'
        ], 'expected props');

        t.ok(parseInt(body.id), 'id: <integer>');

        delete body.created;
        delete body.id;

        t.deepEquals(body, {
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
        },
        headers: {
            Authorization: `Bearer ${token}`
        }
    } , (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(Object.keys(body), [
            'id',
            'name',
            'created',
        ], 'expected props');

        t.ok(body.created, 'created: <date>');

        delete body.created;

        t.deepEquals(body, {
            id: 1,
            name: 'Test Project',
        }, 'expected body');

        t.end();
    });
});

test('new instance', (t) => {
    request({
        method: 'POST',
        json: true,
        url: API + '/api/instance',
        body: {
            model_id: 1,
            project_id: 1,
            mosaic: 'naip.latest'
        },
        headers: {
            Authorization: `Bearer ${token}`
        }
    } , (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(Object.keys(body), [
            'id',
            'created',
            'model_id',
            'token',
            'mosaic'
        ], 'expected props');

        t.ok(parseInt(body.id), 'id: <integer>');
        delete body.id,
        delete body.created;
        instance = body.token;
        delete body.token;

        t.deepEquals(body, {
            model_id: 1,
            mosaic: 'naip.latest'
        }, 'expected body');

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

        if (msg.message === 'info#connected') {
            ws.send(JSON.stringify({
                action: 'model#prediction',
                data: {
                    polygon: {
                        type: 'Polygon',
                        coordinates: [[
                            [ -79.37724530696869, 38.83428180092151 ],
                            [ -79.37677592039108, 38.83428180092151 ],
                            [ -79.37677592039108, 38.83455550411051 ],
                            [ -79.37724530696869, 38.83455550411051 ],
                            [ -79.37724530696869, 38.83428180092151 ]
                        ]]
                    }
                }
            }));
        } else {
            console.error(JSON.stringify(msg, null, 4))
        }
    });
});
