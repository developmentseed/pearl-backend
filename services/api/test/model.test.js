import test from 'tape';
import Flight from './flight';
import { sql } from 'slonik';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);
flight.user(test, 'non_admin', false);

test('GET /api/model (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.deepEquals(res.body, {
            total: 0,
            models: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/model/1 (not found)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model/1',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, {
            status: 404,
            message: 'models not found',
            messages: []
        }, 'body');

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/model/1/download (not found)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model/1/download',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, {
            status: 404,
            message: 'models not found',
            messages: []
        }, 'body');
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
                meta: {}
            }
        }, t);

        t.deepEquals(Object.keys(res.body).sort(), ['active', 'bounds', 'classes', 'created', 'id', 'meta', 'model_inputshape', 'model_type', 'model_zoom', 'name', 'storage', 'uid', 'osmtag_id'].sort(), 'body');
        t.ok(res.body.id, 1, '.id: 1');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/model (storage: false)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.deepEquals(res.body, {
            total: 0,
            models: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/model?storage=all (storage: false)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model?storage=all',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.equals(res.body.total, 1);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/model?storage=all (storage: false, non_admin)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model?storage=all',
            method: 'GET',
            auth: {
                bearer: flight.token.non_admin
            }
        }, t);

        t.deepEquals(res.body, {
            total: 0,
            models: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/model/1/osmtag - No OSMTags', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model/1/osmtag',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, false);

        t.deepEquals(res.body, {
            status: 404,
            message: 'Model does not have OSMTags',
            messages: []
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

test('GET /api/model (storage: true)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.equals(res.body.total, 1, '1 model');
        t.equals(res.body.models.length, 1, '1 model');

        for (const model of res.body.models) {
            t.deepEquals(Object.keys(model).sort(), ['active', 'bounds', 'classes', 'created', 'id', 'meta', 'name', 'storage', 'uid']);

            t.ok(parseInt(model.id), 'id is int');
            t.ok(parseInt(model.uid), 'uid is int');
            t.ok(model.created, 'created is present');
            t.ok(model.bounds, 'bounds is present');
            t.ok(model.active, 'model is active');
            t.ok(model.name, 'name is present');
        }
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/model/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model/1',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            active: true,
            osmtag_id: null,
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
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/model/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model/1',
            method: 'PATCH',
            auth: {
                bearer: flight.token.ingalls
            },
            body: {
                bounds: [-1, -1, 1, 1]
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            active: true,
            uid: 1,
            osmtag_id: null,
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

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
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

test('DELETE /api/model/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model/1',
            method: 'DELETE',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.deepEquals(res.body, {
            status: 200,
            message: 'Model deleted'
        });

        const getRes = await flight.request({
            json: true,
            url: '/api/model',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.equals(getRes.body.total, 0);
        t.equals(getRes.body.models.length, 0);

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/model/1 - fully deleted since no projects depend on it', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/model/1',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');
    } catch (err) {
        t.error(err, 'mo errors');
    }
    t.end();
});

flight.landing(test);
