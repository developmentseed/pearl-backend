import test from 'tape';
import Flight from './flight';
import { sql } from 'slonik';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

flight.fixture(test, 'model.json', 'ingalls');
flight.fixture(test, 'project.json', 'ingalls');
flight.fixture(test, 'checkpoint.json', 'ingalls');

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

test('POST /api/project/1/aoi/1/share', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/share',
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

test('POST /api/project/1/aoi/2/share', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/2/share',
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
                aois
            SET
                storage = true
        `);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/aoi/1/share', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/share',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.ok(res.body.uuid, '.uuid: <uuid>');
        delete res.body.uuid;

        t.deepEquals(res.body, {
            aoi_id: 1,
            project_id: 1,
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

        t.deepEquals(res.body, {
            total: 1,
            project_id: 1,
            shares: [{
                aoi_id: 1,
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

        t.deepEqual(res.body, {
            aoi_id: 1,
            project_id: 1,
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

        t.ok(res.body.shares[0].created, '.shares[0].created: <date>');
        delete res.body.shares[0].created;
        t.ok(res.body.shares[0].uuid, '.shares[0].uuid: <date>');
        delete res.body.shares[0].uuid;

        t.deepEquals(res.body, {
            id: 1,
            area: 1238,
            name: 'Test AOI',
            storage: true,
            bookmarked: false,
            bookmarked_at: null,
            project_id: 1,
            checkpoint_id: 1,
            patches: [],
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
            },
            shares: [{
                aoi_id: 1,
                storage: false
            }]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/1/aoi/1/share/<uuid> - doesn\'t exist', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/share/9218c385-02a8-4334-b574-2992a2810aeb',
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

test('DELETE /api/project/1/aoi/1/<uuid> - exists', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: `/api/project/1/aoi/1/share/${uuid}`,
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
