'use strict';

//
// Test the following authentication flow between services
// - Create new user
// - Create new token
// - Authenticate with WS router
//

const { Flight } = require('./util');
const request = require('request');

const test = require('tape');

const flight = new Flight();
const WebSocket = require('ws');

flight.takeoff(test);

const session = request.jar();
let token, instance;

test('api running', (t) => {
    request({
        method: 'GET',
        json: true,
        url: 'http://localhost:2000/api'
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
        url: 'http://localhost:2000/api/user',
        body: {
            username: 'example',
            email: 'example@example.com',
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
        url: 'http://localhost:2000/api/login',
        jar: session,
        body: {
            username: 'example',
            password: 'password123'
        }
    } , (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, '200 status code');

        t.deepEquals(body, {
            username: 'example'
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
        url: 'http://localhost:2000/api/token',
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

        delete body.created;

        token = body.token;
        delete body.token;

        t.deepEquals(body, {
            id: 1,
            name: 'Access Token'
        }, 'expected body');

        t.end();
    });
});

test('new model', (t) => {
    request({
        method: 'POST',
        json: true,
        url: 'http://localhost:2000/api/model',
        body: { },
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

        delete body.created;

        t.deepEquals(body, {
            id: 1,
        }, 'expected body');

        t.end();
    });
});

test('new instance', (t) => {
    request({
        method: 'POST',
        json: true,
        url: 'http://localhost:2000/api/instance',
        body: {
            model_id: 1
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
            'token'
        ], 'expected props');

        delete body.created;
        instance = body.token;
        delete body.token;

        t.deepEquals(body, {
            id: 1,
            model_id: 1,
        }, 'expected body');

        t.end();
    });
});

test('gpu connection', (t) => {
    const ws = new WebSocket(`http://localhost:1999?token=${instance}`);

    ws.on('open', () => {
        t.ok('connection opened');
        ws.close();
        t.end();
    });
});

flight.landing(test);

