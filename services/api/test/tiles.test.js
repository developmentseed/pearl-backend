const test = require('tape');
const Flight = require('./flight');
const fs = require('fs');
const { sql } = require('slonik');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

test('GET /api/tiles', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/tiles',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            tiles: [
                'qa-latest'
           ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/tiles/qa-latest', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/tiles/qa-latest',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, { });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
