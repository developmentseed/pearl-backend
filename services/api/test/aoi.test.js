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

test('GET /api/project/1/aoi (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.deepEquals(res.body, {
            total: 0,
            project_id: 1,
            aois: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/aoi', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'Test AOI',
                checkpoint_id: 1,
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
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            area: 1238,
            storage: false,
            project_id: 1,
            checkpoint_id: 1,
            bookmarked: false,
            bookmarked_at: null,
            patches: [],
            name: 'Test AOI',
            px_stats: {},
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
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
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            area: 1238,
            bounds: {
                type: 'Polygon',
                coordinates: [[
                    [-79.37724530696869, 38.83428180092151],
                    [-79.37677592039108, 38.83428180092151],
                    [-79.37677592039108, 38.83455550411051],
                    [-79.37724530696869, 38.83455550411051],
                    [-79.37724530696869, 38.83428180092151]
                ]]
            },
            storage: false,
            project_id: 1,
            checkpoint_id: 1,
            bookmarked: false,
            bookmarked_at: null,
            patches: [],
            shares:  [],
            name: 'Test AOI',
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

test('[meta] Set aoi.storage: true', async (t) => {
    try {
        await flight.config.pool.query(sql`
            UPDATE
                aois
            SET
                storage = true
        `, []);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.aois[0].created, '.aois[0].created: <date>');

        delete res.body.aois[0].created;

        t.equals(res.body.total, 1);
        t.equals(res.body.project_id, 1);
        t.equals(res.body.aois.length, 1);
        t.equals(res.body.aois[0].id, 1);
        t.equals(res.body.aois[0].name, 'Test AOI');
        t.deepEquals(res.body.aois[0].shares, []);
        t.equals(res.body.aois[0].storage, true);
        t.equals(res.body.aois[0].bookmarked, false);
        t.deepEquals(res.body.aois[0].px_stats, {});
        t.deepEquals(res.body.aois[0].bounds, {
            type: 'Polygon',
            coordinates: [[
                [-79.37724530696869, 38.83428180092151],
                [-79.37677592039108, 38.83428180092151],
                [-79.37677592039108, 38.83455550411051],
                [-79.37724530696869, 38.83455550411051],
                [-79.37724530696869, 38.83428180092151]
            ]]
        });

        t.equals(res.body.aois[0].checkpoint_id, 1);
        t.equals(res.body.aois[0].checkpoint_name, 'Test Checkpoint');
        t.deepEquals(res.body.aois[0].classes, [{ name: 'Water', color: '#0000FF' }, { name: 'Tree Canopy', color: '#008000' }, { name: 'Field', color: '#80FF80' }, { name: 'Built', color: '#806060' }]);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi?bookmarked=false', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi?bookmarked=false',
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

test('PATCH /api/project/1/aoi/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1',
            method: 'PATCH',
            body: {
                bookmarked: true,
                name: 'RENAMED',
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
        delete res.body.created;
        delete res.body.bookmarked_at;

        t.deepEquals(res.body, {
            id: 1,
            area: 1238,
            storage: true,
            project_id: 1,
            patches: [],
            px_stats: {
                0: 100,
                1: 0
            },
            checkpoint_id: 1,
            bookmarked: true,
            name: 'RENAMED',
            bounds: {
                type: 'Polygon',
                coordinates: [[
                    [-79.37724530696869, 38.83428180092151],
                    [-79.37677592039108, 38.83428180092151],
                    [-79.37677592039108, 38.83455550411051],
                    [-79.37724530696869, 38.83455550411051],
                    [-79.37724530696869, 38.83428180092151]
                ]]
            },
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

test('GET /api/project/1/aoi?bookmarked=true', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi?bookmarked=true',
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

test('POST /api/project/1/aoi', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'Test AOI 2',
                checkpoint_id: 1,
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
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 2,
            area: 1238,
            storage: false,
            project_id: 1,
            checkpoint_id: 1,
            bookmarked: false,
            bookmarked_at: null,
            patches: [],
            name: 'Test AOI 2',
            px_stats: {},
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
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
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi?sort=asc', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi?sort=asc',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.equals(res.statusCode, 200, 'status: 200');

        t.true(new Date(res.body.aois[1].created) > new Date(res.body.aois[0].created));
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/1/aoi/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1',
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
test('GET /api/project/1/aoi?sort=asc', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi?sort=asc',
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
