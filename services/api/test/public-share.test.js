import test from 'tape';
import Flight from './flight.js';
import { sql } from 'slonik';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

flight.fixture(test, 'model.json', 'ingalls');
flight.fixture(test, 'project.json', 'ingalls');
flight.fixture(test, 'checkpoint.json', 'ingalls');
flight.fixture(test, 'aoi.json', 'ingalls');
flight.fixture(test, 'timeframe.json', 'ingalls');

test('GET /api/share', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/share',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            total: 0,
            shares: []
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('[meta] Set aoi.storage: true', async (t) => {
    try {
        await flight.config.pool.query(sql`
            UPDATE
                aoi_timeframe
                    SET
                        storage = true
        `);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});


test('POST /api/project/1/aoi/1/timeframe/1/share - PUBLIC', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe/1/share',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                published: true
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.ok(res.body.uuid, '.uuid: <uuid>');
        delete res.body.uuid;

        t.ok(typeof res.body.aoi === 'object');
        delete res.body.aoi;
        t.ok(typeof res.body.timeframe === 'object');
        delete res.body.timeframe;

        t.ok(typeof res.body.mosaic === 'object');
        delete res.body.mosaic;

        t.deepEquals(res.body, {
            aoi_id: 1,
            project_id: 1,
            timeframe_id: 1,
            published: true,
            bounds: {
                type: 'Polygon',
                bounds: [-79.37724530696869, 38.83428180092151, -79.37677592039108, 38.83455550411051],
                coordinates: [[
                    [-79.37724530696869, 38.83428180092151],
                    [-79.37677592039108, 38.83428180092151],
                    [-79.37677592039108, 38.83455550411051],
                    [-79.37724530696869, 38.83455550411051],
                    [-79.37724530696869, 38.83428180092151]
                ]]
            },
            storage: false,
            patches: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
})

test('POST /api/project/1/aoi/1/timeframe/1/share - PRIVATE', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe/1/share',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.ok(res.body.uuid, '.uuid: <uuid>');
        delete res.body.uuid;

        t.ok(typeof res.body.aoi === 'object');
        delete res.body.aoi;
        t.ok(typeof res.body.timeframe === 'object');
        delete res.body.timeframe;

        t.ok(typeof res.body.mosaic === 'object');
        delete res.body.mosaic;

        t.deepEquals(res.body, {
            aoi_id: 1,
            project_id: 1,
            timeframe_id: 1,
            published: false,
            bounds: {
                type: 'Polygon',
                bounds: [-79.37724530696869, 38.83428180092151, -79.37677592039108, 38.83455550411051],
                coordinates: [[
                    [-79.37724530696869, 38.83428180092151],
                    [-79.37677592039108, 38.83428180092151],
                    [-79.37677592039108, 38.83455550411051],
                    [-79.37724530696869, 38.83455550411051],
                    [-79.37724530696869, 38.83428180092151]
                ]]
            },
            storage: false,
            patches: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
})

test('GET /api/share', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/share',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.equals(res.body.total, 1);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
