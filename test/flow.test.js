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

flight.takeoff(test);

let user;
let token;

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
        url: 'http://localhost:2000/api/user'
    } , (err, res, body) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200);

        t.deepEquals(body, {

        });

        t.end();
    });
});

test('new token', (t) => {
    t.end();
});

flight.landing(test);


