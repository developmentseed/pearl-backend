/* eslint-disable strict */
const test = require('tape');
const request = require('request');
const { Flight } = require('./util');

const flight = new Flight();

flight.takeoff(test);

let token;
test('user', async (t) => {
    token = (await flight.user(t)).token;
    t.end();
});

test('GET /api/user/me (valid token - 200 success)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/user/me',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(res.body, { username: 'example', email: 'example@example.com', access: 'user' });

        t.end();
    });
});

test('GET /api/user/me (public)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/user/me',
        method: 'GET'
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 401, 'status: 401');

        t.deepEquals(res.body, { status: 401, message: 'Authentication Required', messages: [] });

        t.end();
    });
});

test('POST /api/login', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/login',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, { status: 404, message: 'API endpoint does not exist!' });

        t.end();
    });
});

test('POST /api/token', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/token',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: {
            name: 'API Token'
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 400, 'status: 404');

        t.deepEquals(res.body, { status: 400, message: 'Only an Auth0 token can create a API token', messages: [] });

        t.end();
    });
});


flight.landing(test);