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

const test = require('tape');

const WebSocket = require('ws');

const usr = 'example-' + Math.floor(Math.random() * Math.floor(10 ^ 1000));

let flight;
if (process.env.TEST !== 'compose') {
    const { Flight } = require('./util');
    flight = new Flight();
    flight.takeoff(test);
}

const session = request.jar();
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

test('new user', (t) => {
    request({
        method: 'POST',
        json: true,
        url: API + '/api/user',
        body: {
            username: usr ,
            email: `${usr}@example.com`,
            password: 'password123'
        }
    } , (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(body, {
            status: 200,
            message: 'User Created'
        }, 'expected body');

        t.end();
    });
});

test('new session', (t) => {
    request({
        method: 'POST',
        json: true,
        url: API + '/api/login',
        jar: session,
        body: {
            username: usr,
            password: 'password123'
        }
    } , (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(body, {
            username: usr
        }, 'expected body');

        t.equals(res.headers['set-cookie'].length, 1, '1 cookie is set');
        t.equals(res.headers['set-cookie'][0].split('=')[0], 'session', 'session cookie is set');

        t.end();
    });
});

test('new token', (t) => {
    request({
        method: 'POST',
        json: true,
        jar: session,
        url: API + '/api/token',
        body: {
            name: 'Access Token'
        }
    } , (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(Object.keys(body), [
            'id',
            'name',
            'token',
            'created'
        ], 'expected props');

        t.ok(parseInt(body.id), 'id: <integer>');

        delete body.created;
        delete body.id;

        token = body.token;
        delete body.token;

        t.deepEquals(body, {
            name: 'Access Token'
        }, 'expected body');

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
        ws.close();
        t.end();
    });
});

if (process.env.TEST !== 'compose') {
    flight.landing(test);
}

