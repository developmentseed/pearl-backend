import test from 'tape';
import Flight from './flight.js';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

/** NOTE: We currently don't have a QA Tiles sources so this has been commented out **/

test.skip('GET /api/tiles', async (t) => {
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

test.skip('GET /api/tiles/qa-latest', async (t) => {
    try {
        await flight.request({
            json: true,
            url: '/api/tiles/qa-latest',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test.skip('GET /api/tiles/qa-latest/17/100/100.mvt', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/tiles/qa-latest/17/36634/50171.mvt',
            method: 'GET',
            encoding: null,
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 200);
        t.ok(res.body);

        console.error(res.body);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test.skip('GET /api/tiles/qa-latest/13/100/100.mvt', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/tiles/qa-latest/13/100/100.mvt',
            method: 'GET',
            encoding: null,
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 204);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test.skip('GET /api/tiles/qa-latest/17/36634/50171.mvt?types=Point', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/tiles/qa-latest/17/36634/50171.mvt?types=Point',
            method: 'GET',
            encoding: null,
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 200);
        t.ok(res.body);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test.skip('GET /api/tiles/qa-latest/17/100/100.mvt?types=Point,Polygon', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/tiles/qa-latest/17/36634/50171.mvt?types=Point,Polygon',
            method: 'GET',
            encoding: null,
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 200);
        t.ok(res.body);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
