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

test('GET /api/project/1/share', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/share',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            total: 0,
            project_id: 1,
            shares: []
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/aoi/1/timeframe/1/share', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe/1/share',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, {
            status: 404,
            message: 'AOI has not been uploaded',
            messages: []
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/aoi/2/timeframe/2/share', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/2/timeframe/2/share',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, {
            status: 404,
            message: 'aoi not found',
            messages: []
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

test('POST /api/project/1/aoi/1/timeframe/1/share', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe/1/share',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        console.error(res.body);
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
});

let uuid;

test('GET /api/project/1/share', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/share',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.shares[0].created, '.created: <date>');
        delete res.body.shares[0].created;
        uuid = res.body.shares[0].uuid;
        t.ok(res.body.shares[0].uuid, '.uuid: <uuid>');
        delete res.body.shares[0].uuid;

        t.ok(res.body.shares[0].mosaic, '.mosaic');
        delete res.body.shares[0].mosaic;
        t.ok(res.body.shares[0].aoi, '.aoi');
        delete res.body.shares[0].aoi;
        t.ok(res.body.shares[0].timeframe, '.timeframe');
        delete res.body.shares[0].timeframe;

        t.deepEquals(res.body, {
            total: 1,
            project_id: 1,
            shares: [{
                aoi_id: 1,
                timeframe_id: 1,
                storage: false
            }]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/share/uuid', async (t) => {
    try {
        let res = await flight.request({
            json: true,
            url: '/api/project/1/share',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        uuid = res.body.shares[0].uuid;

        res = await flight.request({
            json: true,
            url: `/api/share/${uuid}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.equals(res.statusCode, 200, 'status: 200');

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

        t.deepEqual(res.body, {
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
            patches: [],
            checkpoint_id: 1,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi/1/timeframe/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.ok(res.body.shares[0].created, '.shares[0].created: <date>');
        delete res.body.shares[0].created;
        t.ok(res.body.shares[0].uuid, '.shares[0].uuid: <date>');
        delete res.body.shares[0].uuid;

        t.ok(res.body.mosaic.created);
        t.ok(res.body.mosaic.updated);
        delete res.body.mosaic.created;
        delete res.body.mosaic.updated;

        t.ok(res.body.shares[0].aoi);
        t.ok(res.body.shares[0].timeframe);
        t.ok(res.body.shares[0].mosaic);
        delete res.body.shares[0].aoi;
        delete res.body.shares[0].timeframe;
        delete res.body.shares[0].mosaic;

        t.deepEquals(res.body, {
            id: 1,
            storage: true,
            bookmarked: false,
            bookmarked_at: null,
            aoi_id: 1,
            checkpoint_id: 1,
            patches: [],
            px_stats: {},
            mosaic: {
                id: '87b72c66331e136e088004fba817e3e8',
                name: 'naip.latest',
                params: { assets: 'image', asset_bidx: 'image|1,2,3,4', collection: 'naip' },
                imagery_source_id: 1,
                mosaic_ts_start: null,
                mosaic_ts_end: null,
                ui_params: { assets: 'image', asset_bidx: 'image|1,2,3,4', collection: 'naip' }
            },
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            shares: [{
                aoi_id: 1,
                published: false,
                timeframe_id: 1,
                storage: false
            }]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/1/aoi/1/timeframe/1/share/<uuid> - doesn\'t exist', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe/1/share/9218c385-02a8-4334-b574-2992a2810aeb',
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, {
            status: 404,
            message: 'AOI Share not found',
            messages: []
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/1/aoi/1/timeframe/1/<uuid> - exists', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: `/api/project/1/aoi/1/timeframe/1/share/${uuid}`,
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            status: 200,
            message: 'AOI Share Deleted'
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});


flight.landing(test);
