const test = require('tape');
const Flight = require('./flight');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

test('GET /api/mosaic', async(t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/mosaic',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            mosaics: [
                'naip.latest'
            ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/mosaic/naip.latest', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/mosaic/naip.latest',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
