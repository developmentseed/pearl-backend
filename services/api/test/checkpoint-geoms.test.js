const test = require('tape');
const Flight = require('./flight');
const { sql } = require('slonik');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

test('POST /api/model', async (t) => {
    try {
        const res = await flight.request({
            method: 'POST',
            json: true,
            url: 'http://localhost:2000/api/model',
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
            },
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('POST /api/project', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'Test Project',
                model_id: 1,
                mosaic: 'naip.latest'
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            uid: 1,
            name: 'Test Project',
            model_id: 1,
            mosaic: 'naip.latest'
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/checkpoint (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/checkpoint',
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

test('POST /api/project/1/checkpoint', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/checkpoint',
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
                ],
                retrain_geoms: [
                    { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] },
                    { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] },
                    { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] },
                    { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] }
                ],
                input_geoms: [
                    { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] } }, { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-79.38049077987671, 38.83848752076715], [-79.37873125076294, 38.83848752076715], [-79.37873125076294, 38.8397243269996], [-79.38049077987671, 38.8397243269996], [-79.38049077987671, 38.83848752076715]]] } }] },
                    { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] } }] },
                    { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] } }] },
                    { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] } }] }
                ],
                analytics: [
                    { counts: 1, f1score: 1, percent: 1 },
                    { counts: 2, f1score: 2, percent: 2 },
                    { counts: 3, f1score: 3, percent: 3 },
                    { counts: 4, f1score: 4, percent: 4 }
                ]
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            name: 'TEST',
            project_id: 1,
            parent: null,
            storage: false,
            bookmarked: false,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] },
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] },
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] },
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] }
            ],
            input_geoms: [
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] } }, { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-79.38049077987671, 38.83848752076715], [-79.37873125076294, 38.83848752076715], [-79.37873125076294, 38.8397243269996], [-79.38049077987671, 38.8397243269996], [-79.38049077987671, 38.83848752076715]]] } }] },
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] } }] },
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] } }] },
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] } }] }
            ],
            analytics: [
                { counts: 1, f1score: 1, percent: 1 },
                { counts: 2, f1score: 2, percent: 2 },
                { counts: 3, f1score: 3, percent: 3 },
                { counts: 4, f1score: 4, percent: 4 }
            ]
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/project/1/checkpoint/1 (no class length change)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/checkpoint/1',
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
            url: 'http://localhost:2000/api/project/1/checkpoint/1',
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
            project_id: 1,
            storage: false,
            bookmarked: true,
            parent: null,
            classes: [
                { name: 'Water', color: '#FF00FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] },
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] },
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] },
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] }
            ],
            input_geoms: [
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] } }, { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-79.38049077987671, 38.83848752076715], [-79.37873125076294, 38.83848752076715], [-79.37873125076294, 38.8397243269996], [-79.38049077987671, 38.8397243269996], [-79.38049077987671, 38.83848752076715]]] } }] },
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] } }] },
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] } }] },
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] } }] }
            ],
            analytics: [
                { counts: 1, f1score: 1, percent: 1 },
                { counts: 2, f1score: 2, percent: 2 },
                { counts: 3, f1score: 3, percent: 3 },
                { counts: 4, f1score: 4, percent: 4 }
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
            url: 'http://localhost:2000/api/project/1/checkpoint/1',
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
            name: 'NEW NAME',
            bookmarked: true,
            parent: null,
            classes: [
                { name: 'Water', color: '#FF00FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            storage: false,
            bounds: [-86.8359375, 34.8859309407532, -73.828125, 51.1793429792893],
            center: [-80.33203125, 43.0326369600212],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] },
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] },
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] },
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] }
            ],
            input_geoms: [
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] } }, { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-79.38049077987671, 38.83848752076715], [-79.37873125076294, 38.83848752076715], [-79.37873125076294, 38.8397243269996], [-79.38049077987671, 38.8397243269996], [-79.38049077987671, 38.83848752076715]]] } }] },
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] } }] },
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] } }] },
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] } }] }
            ],
            analytics: [
                { counts: 1, f1score: 1, percent: 1 },
                { counts: 2, f1score: 2, percent: 2 },
                { counts: 3, f1score: 3, percent: 3 },
                { counts: 4, f1score: 4, percent: 4 }
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
            UPDATE checkpoints SET storage = True
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
            url: 'http://localhost:2000/api/project/1/checkpoint',
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

test('POST /api/project/1/checkpoint', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/checkpoint',
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
                ],
                retrain_geoms: [
                    { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] },
                    { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] },
                    { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] },
                    { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] }
                ],
                input_geoms: [
                    { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] } }, { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-79.38049077987671, 38.83848752076715], [-79.37873125076294, 38.83848752076715], [-79.37873125076294, 38.8397243269996], [-79.38049077987671, 38.8397243269996], [-79.38049077987671, 38.83848752076715]]] } }] },
                    { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] } }] },
                    { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] } }] },
                    { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] } }] }
                ],
                analytics: [
                    { counts: 1, f1score: 1, percent: 1 },
                    { counts: 2, f1score: 2, percent: 2 },
                    { counts: 3, f1score: 3, percent: 3 },
                    { counts: 4, f1score: 4, percent: 4 }
                ]
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 2,
            name: 'TEST',
            project_id: 1,
            parent: 1,
            storage: false,
            bookmarked: false,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] },
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] },
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] },
                { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] }
            ],
            input_geoms: [
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] } }, { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-79.38049077987671, 38.83848752076715], [-79.37873125076294, 38.83848752076715], [-79.37873125076294, 38.8397243269996], [-79.38049077987671, 38.8397243269996], [-79.38049077987671, 38.83848752076715]]] } }] },
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] } }] },
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317], [-73.828125, 51.17934297928927]] } }] },
                { type: 'FeatureCollection', 'features': [{ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[-86.8359375, 34.88593094075317]] } }] }
            ],
            analytics: [
                { counts: 1, f1score: 1, percent: 1 },
                { counts: 2, f1score: 2, percent: 2 },
                { counts: 3, f1score: 3, percent: 3 },
                { counts: 4, f1score: 4, percent: 4 }
            ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/checkpoint/1/tiles - geometries', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/checkpoint/1/tiles',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            tilejson: '2.2.0',
            name: 'checkpoint-1',
            version: '1.0.0',
            schema: 'xyz',
            tiles: ['/project/1/checkpoint/1/tiles/{z}/{x}/{y}.mvt'],
            bounds: [-86.8359375, 34.8859309407532, -73.828125, 51.1793429792893],
            center: [-80.33203125, 43.0326369600212]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/checkpoint/1/tiles/1/0/0 - geometries', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/checkpoint/1/tiles/1/0/0.mvt',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(Buffer.from(res.body).toString('hex'), '1aefbfbd010a0464617461120f0801120200001801220509efbfbd21efbfbd3212130801120200011801220911efbfbd21efbfbd32efbfbd04efbfbd0712130801120200021801220911efbfbd21efbfbd32efbfbd04efbfbd07120f0801120200031801220509efbfbd21efbfbd32120f0802120200001801220509efbfbd21efbfbd3212130802120200011801220911efbfbd21efbfbd32efbfbd04efbfbd0712130802120200021801220911efbfbd21efbfbd32efbfbd04efbfbd07120f0802120200031801220509efbfbd21efbfbd321a05636c6173732202280122022802220228032202280428efbfbd207802');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
