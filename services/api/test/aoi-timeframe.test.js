import test from 'tape';
import Flight from './flight.js';
import fs from 'fs';
import { sql } from 'slonik';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

flight.fixture(test, 'model.json', 'ingalls');
flight.fixture(test, 'project.json', 'ingalls');
flight.fixture(test, 'checkpoint.json', 'ingalls');
flight.fixture(test, 'aoi.json', 'ingalls');

test('GET /api/project/1/aoi/1/timeframe (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.deepEquals(res.body, {
            total: 0,
            project_id: 1,
            aoi_id: 1,
            timeframes: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/aoi/1/timeframe - invalid mosaic', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'Test AOI',
                checkpoint_id: 1,
                mosaic: 'fake.naip',
                bounds: {
                    type: 'Polygon',
                    coordinates: [[
                        [-79.37724530696869, 38.83428180092151],
                        [-79.37677592039108, 38.83428180092151],
                        [-79.37677592039108, 38.83455550411051],
                        [-79.37724530696869, 38.83455550411051],
                        [-79.37724530696869, 38.83428180092151]
                    ]]
                }
            }
        }, false);

        t.deepEquals(res.body, {
            status: 400,
            message: 'Invalid Mosaic',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/aoi/1/timeframe', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                mosaic: 'naip.latest',
                checkpoint_id: 1
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;
        t.ok(res.body.mosaic_ts, '.mosaic_ts: <date>');
        delete res.body.mosaic_ts;

        t.deepEquals(res.body, {
            id: 1,
            storage: false,
            aoi_id: 1,
            checkpoint_id: 1,
            bookmarked: false,
            bookmarked_at: null,
            mosaic: 'naip.latest',
            patches: [],
            px_stats: {},
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
        t.ok(res.body.mosaic_ts, '.mosaic_ts: <date>');
        delete res.body.mosaic_ts;

        t.deepEquals(res.body, {
            id: 1,
            storage: false,
            aoi_id: 1,
            checkpoint_id: 1,
            mosaic: 'naip.latest',
            bookmarked: false,
            bookmarked_at: null,
            patches: [],
            shares:  [],
            px_stats: {},
            classes: [
                { name: 'Water', color: '#0000FF' }, { name: 'Tree Canopy', color: '#008000' }, { name: 'Field', color: '#80FF80' }, { name: 'Built', color: '#806060' }
            ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('[meta] Set aoi_timeframe.storage: true', async (t) => {
    try {
        await flight.config.pool.query(sql`
            UPDATE
                aoi_timeframe
            SET
                storage = true
        `, []);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi/1/timeframe', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.timeframes[0].created, '.timeframes[0].created: <date>');

        delete res.body.timeframes[0].created;

        t.equals(res.body.total, 1);
        t.equals(res.body.project_id, 1);
        t.equals(res.body.timeframes.length, 1);
        t.equals(res.body.timeframes[0].id, 1);
        t.deepEquals(res.body.timeframes[0].shares, []);
        t.equals(res.body.timeframes[0].storage, true);
        t.equals(res.body.timeframes[0].bookmarked, false);
        t.deepEquals(res.body.timeframes[0].px_stats, {});
        t.equals(res.body.timeframes[0].checkpoint_id, 1);
        t.equals(res.body.timeframes[0].checkpoint_name, 'Test Checkpoint');
        t.equals(res.body.timeframes[0].mosaic, 'naip.latest');
        t.deepEquals(res.body.timeframes[0].classes, [{ name: 'Water', color: '#0000FF' }, { name: 'Tree Canopy', color: '#008000' }, { name: 'Field', color: '#80FF80' }, { name: 'Built', color: '#806060' }]);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi/1/timeframe?bookmarked=false', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe?bookmarked=false',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body.total, 1);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});


// The following 2 tests are skipped as they can't run without
// TiTiler running as well - should add something like this to flow.test.js

let url;
test.skip('GET /api/project/1/aoi/1/tiles', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/tiles',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        });

        t.equals(res.statusCode, 200, 'status: 200');

        url = res.body.tiles[0];
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test.skip('GET /api/project/1/aoi/1/tiles/9/143/195', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '' + url.replace('{z}', 9).replace('{x}', '143').replace('{y}', '195'),
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        });

        t.equals(res.statusCode, 200, 'status: 200');

        fs.writeFileSync('/tmp/sample.png', res.body);
        t.ok(true, 'ok - written png to /tmp/sample.png');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/project/1/aoi/1/timeframe/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe/1',
            method: 'PATCH',
            body: {
                bookmarked: true,
                px_stats: {
                    0: 100,
                    1: 0
                }
            },
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        t.ok(res.body.bookmarked_at, '.bookmarked_at: <date>');
        t.ok(res.body.mosaic_ts, '.mosaic_ts: <date>');
        delete res.body.created;
        delete res.body.bookmarked_at;
        delete res.body.mosaic_ts;

        t.deepEquals(res.body, {
            id: 1,
            storage: true,
            aoi_id: 1,
            patches: [],
            px_stats: {
                0: 100,
                1: 0
            },
            mosaic: 'naip.latest',
            checkpoint_id: 1,
            bookmarked: true,
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

test('GET /api/project/1/aoi/1/timeframe?bookmarked=true', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe?bookmarked=true',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body.total, 1);

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/aoi/1/timeframe', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                mosaic: 'naip.latest',
                checkpoint_id: 1
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;
        t.ok(res.body.mosaic_ts, '.mosaic_ts: <date>');
        delete res.body.mosaic_ts;

        t.deepEquals(res.body, {
            id: 2,
            storage: false,
            aoi_id: 1,
            checkpoint_id: 1,
            bookmarked: false,
            bookmarked_at: null,
            mosaic: 'naip.latest',
            patches: [],
            px_stats: {},
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

test('GET /api/project/1/aoi/1/timeframe?sort=asc', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe?sort=asc',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.equals(res.statusCode, 200, 'status: 200');

        t.true(new Date(res.body.timeframes[1].created) > new Date(res.body.timeframes[0].created));
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/1/aoi/1/timeframe/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe/1',
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            status: 200,
            message: 'AOI Deleted'
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

// after delete there should only be 1 aoi
test('GET /api/project/1/aoi/1/timeframe?sort=asc', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/timeframe?sort=asc',
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