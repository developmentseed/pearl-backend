import test from 'tape';
import Flight from './flight.js';

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

test('GET /api/imagery', async(t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/imagery',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        delete res.body.imagery_sources[0].created;
        delete res.body.imagery_sources[0].updated;
        t.deepEquals(res.body, {
            total: 1,
            imagery_sources: [{
                id: 1,
                name: 'NAIP'
            }]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/mosaic?sourceid=1', async(t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/mosaic?sourceid=1',
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

test('GET /api/mosaic?sourceid=2', async(t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/mosaic?sourceid=2',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            mosaics: []
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
