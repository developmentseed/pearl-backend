'use strict';

//
// Test the following authentication flow between services
// - Create new user
// - Create new token
// - Authenticate with WS router
//

const request = require('request');

const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'http://localhost:1999';

const TEST = process.env.TEST;
const GPU = process.env.GPU;

const test = require('tape');

const WebSocket = require('ws');

const usr = 'example-' + Math.floor(Math.random() * Math.floor(10 ^ 1000));

let flight;
if (process.env.TEST !== 'compose') {
    const { Flight } = require('./util');
    flight = new Flight();
    flight.takeoff(test);
}

let token, instance;

test('api running', (t) => {
    request({
        method: 'GET',
        json: true,
        url: API + '/api'
    } , (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200);

        t.deepEquals(body, {
            version: '1.0.0'
        });

        t.end();
    });
});

test('user', async (t) => {
    token = (await flight.api.user(t)).token;
    t.end();
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

test('new instance', (t) => {
    request({
        method: 'POST',
        json: true,
        url: API + '/api/instance',
        body: {
            model_id: 1,
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
        }
    });
});

if (process.env.TEST !== 'compose') {
    flight.landing(test);
}


