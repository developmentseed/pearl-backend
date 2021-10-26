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
                    1: [{
                        key: 'natural',
                        value: 'water'
                    }]
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
                    1: [{ key: 'natural', value: 'water' }],
                    2: [{ key: 'natural', value: 'water' }],
                    3: [{ key: 'natural', value: 'water' }],
                    4: [{ key: 'natural', value: 'water' }]
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
                    0: [{ key: 'natural', value: 'water' }],
                    1: [{ key: 'natural', value: 'forest' }],
                    2: [{ key: 'natural', value: 'field' }],
                    3: [{ key: 'building', value: 'yes' }]
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
                0: [{ key: 'natural', value: 'water' }],
                1: [{ key: 'natural', value: 'forest' }],
                2: [{ key: 'natural', value: 'field' }],
                3: [{ key: 'building', value: 'yes' }]
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
                    0: [{
                        key: 'natural',
                        value: 'water'
                    },{
                        key: 'coastline',
                        value: 'yes'
                    }],
                    1: [],
                    2: [{
                        key: 'natural',
                        value: 'field'
                    }],
                    3: [{
                        key: 'building',
                        value: 'yes'
                    }]
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
                0: [{
                    key: 'natural',
                    value: 'water'
                },{
                    key: 'coastline',
                    value: 'yes'
                }],
                1: [],
                2: [{
                    key: 'natural',
                    value: 'field'
                }],
                3: [{
                    key: 'building',
                    value: 'yes'
                }]
            }
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/model - no initial tagmap', async (t) => {
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
                meta: {}
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 2,
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
            osmtag_id: null
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/model/2 - no initial tagmap', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model/2',
            method: 'PATCH',
            auth: {
                bearer: flight.token.ingalls
            },
            body: {
                tagmap: {
                    0: [{ key: 'natural', value: 'water' }],
                    1: [{ key: 'natural', value: 'forest' }],
                    2: [{ key: 'natural', value: 'field' }],
                    3: [{ key: 'building', value: 'yes' }]
                }
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 2,
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
            osmtag_id: 2
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
