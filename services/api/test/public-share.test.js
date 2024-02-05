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

let publicuuid;
let privateuuid;

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

        publicuuid = res.body.uuid;

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

        t.ok(typeof res.body.imagery === 'object');
        delete res.body.imagery;

        t.ok(typeof res.body.checkpoint === 'object');
        delete res.body.checkpoint;

        t.ok(typeof res.body.model === 'object');
        delete res.body.model;

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
});

test('POST /api/project/1/aoi/1/timeframe/1/share - PRIVATE', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe/1/share',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        privateuuid = res.body.uuid;

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

        t.ok(typeof res.body.model === 'object');
        delete res.body.model;

        t.ok(typeof res.body.imagery === 'object');
        delete res.body.imagery;

        t.ok(typeof res.body.checkpoint === 'object');
        delete res.body.checkpoint;

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
});

test('PATCH /api/share - Empty Body', async (t) => {
    try {
        await flight.request({
            json: true,
            url: `/api/share/${publicuuid}`,
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {}
        }, t);

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/share - Make Private', async (t) => {
    try {
        await flight.request({
            json: true,
            url: `/api/share/${publicuuid}`,
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                published: false
            }
        }, t);

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/share - Make Public', async (t) => {
    try {
        await flight.request({
            json: true,
            url: `/api/share/${privateuuid}`,
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                published: true
            }
        }, t);

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

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

        t.ok(res.body.shares[0].created, '.created: <date>');
        delete res.body.shares[0].created;

        t.ok(res.body.shares[0].uuid, '.uuid: <uuid>');
        delete res.body.shares[0].uuid;

        t.ok(typeof res.body.shares[0].aoi === 'object');
        delete res.body.shares[0].aoi;
        t.ok(typeof res.body.shares[0].timeframe === 'object');
        delete res.body.shares[0].timeframe;
        t.ok(typeof res.body.shares[0].mosaic === 'object');
        delete res.body.shares[0].mosaic;
        t.ok(typeof res.body.shares[0].model === 'object');
        delete res.body.shares[0].model;
        t.ok(typeof res.body.shares[0].imagery === 'object');
        delete res.body.shares[0].imagery;
        t.ok(typeof res.body.shares[0].checkpoint === 'object');
        delete res.body.shares[0].checkpoint;

        t.deepEquals(res.body, {
            total: 1,
            shares: [{
                aoi_id: 1,
                timeframe_id: 1,
                published: true,
                storage: false
            }]
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
