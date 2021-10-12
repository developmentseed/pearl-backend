const test = require('tape');
const Flight = require('./flight');
const { sql } = require('slonik');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

test('POST /api/model - Error: Entry for every class', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model',
            method: 'POST',
            auth: {
                bearer: flight.token.ingalls
            },
            body: {
                name: 'NAIP Supervised',
                active: true,
                model_type: 'pytorch_example',
                model_inputshape: [240,240,4],
                model_zoom: 17,
                classes: [
                    { name: 'Water', color: '#0000FF' },
                    { name: 'Tree Canopy', color: '#008000' },
                    { name: 'Field', color: '#80FF80' },
                    { name: 'Built', color: '#806060' }
                ],
                tagmap: {
                    1: {
                        'natural': 'water'
                    }
                },
                meta: {}
            }
        }, false);

        t.deepEquals(res.body, {
            status: 400,
            message: 'OSMTag must have key entry for every class in array',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/model - Error: OSMTag missing entry', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model',
            method: 'POST',
            auth: {
                bearer: flight.token.ingalls
            },
            body: {
                name: 'NAIP Supervised',
                active: true,
                model_type: 'pytorch_example',
                model_inputshape: [240,240,4],
                model_zoom: 17,
                classes: [
                    { name: 'Water', color: '#0000FF' },
                    { name: 'Tree Canopy', color: '#008000' },
                    { name: 'Field', color: '#80FF80' },
                    { name: 'Built', color: '#806060' }
                ],
                tagmap: {
                    1: { 'natural': 'water' },
                    2: { 'natural': 'water' },
                    3: { 'natural': 'water' },
                    4: { 'natural': 'water' }
                },
                meta: {}
            }
        }, false);

        t.deepEquals(res.body, {
            status: 400,
            message: 'OSMTag missing entry for Water class (Element 0)',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/model', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model',
            method: 'POST',
            auth: {
                bearer: flight.token.ingalls
            },
            body: {
                name: 'NAIP Supervised',
                active: true,
                model_type: 'pytorch_example',
                model_inputshape: [240,240,4],
                model_zoom: 17,
                classes: [
                    { name: 'Water', color: '#0000FF' },
                    { name: 'Tree Canopy', color: '#008000' },
                    { name: 'Field', color: '#80FF80' },
                    { name: 'Built', color: '#806060' }
                ],
                tagmap: {
                    0: { 'natural': 'water' },
                    1: { 'natural': 'forest' },
                    2: { 'natural': 'field' },
                    3: { 'building': 'yes' }
                },
                meta: {}
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            uid: 1,
            name: 'NAIP Supervised',
            active: true,
            model_type: 'pytorch_example',
            model_zoom: 17,
            model_inputshape: [240, 240, 4],
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            storage: false,
            bounds: [-180, -90, 180, 90],
            meta: {},
            osmtag_id: 1
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
                models
            SET
                storage = True
        `);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/model/1/osmtag', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model/1/osmtag',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;

        t.ok(res.body.updated);
        delete res.body.updated;

        t.deepEquals(res.body, {
            id: 1,
            project_id: null,
            tagmap: {
                0: { natural: 'water' },
                1: { natural: 'forest' },
                2: { natural: 'field' },
                3: { building: 'yes' }
            }
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/model', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model/1',
            method: 'PATCH',
            auth: {
                bearer: flight.token.ingalls
            },
            body: {
                tagmap: {
                    0: { 'natural': 'water', 'coastline': 'yes' },
                    1: { },
                    2: { 'natural': 'field' },
                    3: { 'building': 'yes' }
                }
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            uid: 1,
            name: 'NAIP Supervised',
            active: true,
            model_type: 'pytorch_example',
            model_zoom: 17,
            model_inputshape: [240, 240, 4],
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            storage: true,
            bounds: [-180, -90, 180, 90],
            meta: {},
            osmtag_id: 1
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/model/1/osmtag', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model/1/osmtag',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;

        t.ok(res.body.updated);
        delete res.body.updated;

        t.deepEquals(res.body, {
            id: 1,
            project_id: null,
            tagmap: {
                0: { natural: 'water', coastline: 'yes' },
                1: { },
                2: { natural: 'field' },
                3: { building: 'yes' }
            }
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
