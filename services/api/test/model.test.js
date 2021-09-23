const test = require('tape');
const request = require('request');
const Flight = require('./flight');
const { sql } = require('slonik');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

test('GET /api/model (empty)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/model',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(res.body, {
            models: []
        });

        t.end();
    });
});

test('GET /api/model/1 (not found)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/model/1',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');

        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, {
            status: 404,
            message: 'No model found',
            messages: []
        }, 'body');

        t.end();
    });
});

test('GET /api/model/1/download (not found)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/model/1/download',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');

        if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
            t.equals(res.statusCode, 404, 'status: 404');

            t.deepEquals(res.body, {
                status: 404,
                message: 'No model found',
                messages: []
            }, 'body');
        } else {
            t.equals(res.statusCode, 404, 'status: 404');

            t.deepEquals(res.body, {
                status: 404,
                message: 'No model found',
                messages: []
            }, 'body');
        }

        t.end();
    });
});

test('POST /api/model', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/model',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
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
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(Object.keys(res.body).sort(), ['active', 'bounds', 'classes', 'created', 'id', 'meta', 'model_inputshape', 'model_type', 'model_zoom', 'name', 'storage', 'uid'], 'body');
        t.ok(res.body.id, 1, '.id: 1');

        t.end();
    });
});

test('GET /api/model (storage: false)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/model',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(Object.keys(res.body).sort(), ['models'], 'body');
        t.equals(res.body.models.length, 0, '0 model');
        t.end();
    });
});

test('Set Storage: true', async (t) => {
    await flight.config.pool.query(sql`
        UPDATE
            models
        SET
            storage = True
    `);

    t.end();
});

test('GET /api/model (storage: true)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/model',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(Object.keys(res.body).sort(), ['models'], 'body');
        t.equals(res.body.models.length, 1, '1 model');

        for (const model of res.body.models) {
            t.deepEquals(Object.keys(model).sort(), ['active', 'bounds', 'classes', 'created', 'id', 'meta', 'name', 'uid']);

            t.ok(parseInt(model.id), 'id is int');
            t.ok(parseInt(model.uid), 'uid is int');
            t.ok(model.created, 'created is present');
            t.ok(model.bounds, 'bounds is present');
            t.ok(model.active, 'model is active');
            t.ok(model.name, 'name is present');
        }

        t.end();
    });
});

test('GET /api/model/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/model/1',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(Object.keys(res.body).sort(), [
            'active', 'bounds', 'classes', 'created', 'id', 'meta', 'model_inputshape', 'model_type', 'model_zoom', 'name', 'storage', 'uid'
        ], 'body');

        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            active: true,
            uid: 1,
            bounds: [-180, -90, 180, 90],
            name: 'NAIP Supervised',
            model_type: 'pytorch_example',
            model_inputshape: [240, 240, 4],
            model_zoom: 17,
            storage: true,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            meta: {}
        }, 'body');

        t.end();
    });
});

test('GET /api/model/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/model/1',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(Object.keys(res.body).sort(), [
            'active', 'bounds', 'classes', 'created', 'id', 'meta', 'model_inputshape', 'model_type', 'model_zoom', 'name', 'storage', 'uid'
        ], 'body');

        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            active: true,
            uid: 1,
            bounds: [-180, -90, 180, 90],
            name: 'NAIP Supervised',
            model_type: 'pytorch_example',
            model_inputshape: [240, 240, 4],
            model_zoom: 17,
            storage: true,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            meta: {}
        }, 'body');

        t.end();
    });
});

test('PATCH /api/model/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/model/1',
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        },
        body: {
            bounds: [-1, -1, 1, 1]
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(Object.keys(res.body).sort(), [
            'active', 'bounds', 'classes', 'created', 'id', 'meta', 'model_inputshape', 'model_type', 'model_zoom', 'name', 'storage', 'uid'
        ], 'body');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            active: true,
            uid: 1,
            bounds: [-1, -1, 1, 1],
            name: 'NAIP Supervised',
            model_type: 'pytorch_example',
            model_inputshape: [240, 240, 4],
            model_zoom: 17,
            storage: true,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            meta: {}
        }, 'body');

        t.end();
    });
});

test('[meta] Set model.storage: true', async (t) => {
    try {
        await flight.config.pool.query(sql`
            UPDATE
                models
            SET
                storage = true
        `);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
    test('GET /api/model/1/download', (t) => {
        request({
            json: true,
            url: 'http://localhost:2000/api/model/1/download',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, (err, res) => {
            t.error(err, 'no errors');
            t.equals(res.statusCode, 200, 'status: 200');
            t.equals(res.headers['transfer-encoding'], 'chunked');

            t.end();
        });
    });
}

flight.landing(test);
