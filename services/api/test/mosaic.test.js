const test = require('tape');
const request = require('request');
const Flight = require('./flight');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

test('GET /api/mosaic', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/mosaic',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(res.body, {
            mosaics: [
                'naip.latest'
            ]
        });

        t.end();
    });
});

test('GET /api/mosaic/naip.latest', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/mosaic/naip.latest',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 404, 'status: 404');

        t.end();
    });
});

flight.landing(test);
