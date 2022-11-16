
const test = require('tape');
const Flight = require('./flight');
const { sql } = require('slonik');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

flight.fixture(test, 'model.json', 'ingalls');
flight.fixture(test, 'project.json', 'ingalls');

test('GET /api/project/1/checkpoint (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.equals(res.statusCode, 200, 'status: 200');
        t.deepEquals(res.body, {
            total: 0,
            project_id: 1,
            checkpoints: []
        }, t);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/checkpoint', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'TEST',
                classes: [
                    { name: 'Water', color: '#0000FF' },
                    { name: 'Tree Canopy', color: '#008000' },
                    { name: 'Field', color: '#80FF80' },
                    { name: 'Built', color: '#806060' }
                ]
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            name: 'TEST',
            parent: null,
            project_id: 1,
            storage: false,
            analytics: null,
            bookmarked: false,
            osmtag_id: null,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] }
            ],
            input_geoms: [
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] }
            ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/checkpoint/1/osmtag', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint/1/osmtag',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.deepEquals(res.body, {
            status: 404,
            message: 'Checkpoint does not have OSMTags',
            messages: []
        }, t);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/project/1/checkpoint/1 (no class length change)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint/1',
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                classes: [
                    { name: 'Water', color: '#0000FF' },
                    { name: 'Tree Canopy', color: '#008000' },
                    { name: 'Field', color: '#80FF80' }
                ]
            }
        }, false);

        t.equals(res.statusCode, 400, 'status: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'Cannot change the number of classes once a checkpoint is created',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/project/1/checkpoint/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint/1',
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'NEW NAME',
                bookmarked: true,
                classes: [
                    { name: 'Water', color: '#FF00FF' },
                    { name: 'Tree Canopy', color: '#008000' },
                    { name: 'Field', color: '#80FF80' },
                    { name: 'Built', color: '#806060' }
                ]
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            name: 'NEW NAME',
            parent: null,
            project_id: 1,
            storage: false,
            analytics: null,
            bookmarked: true,
            osmtag_id: null,
            classes: [
                { name: 'Water', color: '#FF00FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] }
            ],
            input_geoms: [
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] }
            ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/checkpoint/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            project_id: 1,
            osmtag_id: null,
            parent: null,
            name: 'NEW NAME',
            bookmarked: true,
            analytics: null,
            classes: [
                { name: 'Water', color: '#FF00FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            storage: false,
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] }
            ],
            input_geoms: [
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] }
            ]
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('Set Storage: true', async (t) => {
    try {
        await flight.config.pool.query(sql`
            UPDATE
                checkpoints
            SET
                storage = True
        `);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/checkpoint', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.checkpoints[0].created, '.checkpoints[0].created: <date');
        delete res.body.checkpoints[0].created;

        t.deepEquals(res.body, {
            total: 1,
            project_id: 1,
            checkpoints: [{
                id: 1,
                parent: null,
                name: 'NEW NAME',
                storage: true,
                bookmarked: true
            }]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/checkpoint?bookmarked=true', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint?bookmarked=true',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.checkpoints[0].created, '.checkpoints[0].created: <date');
        delete res.body.checkpoints[0].created;

        t.deepEquals(res.body, {
            total: 1,
            project_id: 1,
            checkpoints: [{
                id: 1,
                parent: null,
                name: 'NEW NAME',
                storage: true,
                bookmarked: true
            }]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/checkpoint?bookmarked=false', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint?bookmarked=false',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            total: 0,
            project_id: 1,
            checkpoints: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/checkpoint (sort)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'TEST 2',
                classes: [
                    { name: 'Water', color: '#0000FF' },
                    { name: 'Tree Canopy', color: '#008000' },
                    { name: 'Field', color: '#80FF80' },
                    { name: 'Built', color: '#806060' }
                ]
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 2,
            name: 'TEST 2',
            parent: null,
            osmtag_id: null,
            project_id: 1,
            storage: false,
            analytics: null,
            bookmarked: false,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] }
            ],
            input_geoms: [
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] }
            ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/checkpoint?sort=asc', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint?sort=asc',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.true(new Date(res.body.checkpoints[1].created) > new Date(res.body.checkpoints[0].created));
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});


test('GET /api/project/1/checkpoint/1/tiles - no geometry', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint/1/tiles',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, { status: 404, message: 'Checkpoint has no geometries to serve', messages: [] });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/checkpoint/1/tiles/1/0/0.mvt - no geometry', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint/1/tiles/1/0/0.mvt',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, { status: 404, message: 'Checkpoint has no geometries to serve', messages: [] });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/checkpoint - wrong parent', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'TEST',
                parent: 100,
                classes: [
                    { name: 'Water', color: '#0000FF' },
                    { name: 'Tree Canopy', color: '#008000' },
                    { name: 'Field', color: '#80FF80' },
                    { name: 'Built', color: '#806060' }
                ]
            }
        }, false);

        t.equals(res.statusCode, 400, 'status: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'Parent does not exist',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/checkpoint - parent', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'TEST',
                parent: 1,
                classes: [
                    { name: 'Water', color: '#0000FF' },
                    { name: 'Tree Canopy', color: '#008000' },
                    { name: 'Field', color: '#80FF80' },
                    { name: 'Built', color: '#806060' }
                ]
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 4,
            name: 'TEST',
            osmtag_id: null,
            parent: 1,
            project_id: 1,
            storage: false,
            analytics: null,
            bookmarked: false,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] }
            ],
            input_geoms: [
                { type: 'GeometryCollection', geometries: [] },
                { type: 'GeometryCollection', geometries: [] },
                { type: 'GeometryCollection', geometries: [] },
                { type: 'GeometryCollection', geometries: [] }
            ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/1/checkpoint/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint/1',
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            status: 200,
            message: 'Checkpoint deleted'
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/1/checkpoint/4', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint/4',
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            status: 200,
            message: 'Checkpoint deleted'
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/1/checkpoint/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint/1',
            method: 'DELETE',
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
