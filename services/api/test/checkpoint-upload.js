const fs = require('fs');
const path = require('path');
const test = require('tape');

const Flight = require('./flight');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

test('POST /api/model', async (t) => {
    try {
        await flight.request({
            method: 'POST',
            json: true,
            url: '/api/model',
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
            auth: {
                bearer: flight.token.ingalls
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
            url: '/api/project',
            method: 'POST',
            auth: {
                bearer: flight.token.ingalls
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

test('POST /api/project/1/checkpoint', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint',
            method: 'POST',
            auth: {
                bearer: flight.token.ingalls
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

        await flight.request({
            json: true,
            url: `/api/project/1/checkpoint/${res.body.id}/upload`,
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            auth: {
                bearer: flight.token.ingalls
            },
            formData : {
                file : fs.createReadStream(path.resolve(__dirname, './fixtures/asset'))
            }
        }, t);
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
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            name: 'TEST',
            parent: null,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            storage: true,
            bookmarked: false,
            project_id: 1,
            analytics: null,
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

test('GET /api/project/1/checkpoint/1/download', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint/1/download',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, false);

        t.deepEquals(res.body, {
            note: 'This is just a file we use to test uploads'
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
