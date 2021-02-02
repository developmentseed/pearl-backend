'use strict';

const test = require('tape');
const request = require('request');

module.exports = async function(flight, token) {
    test('GET /api/model (empty)', (t) => {
        request({
            json: true,
            url: 'http://localhost:2000/api/model',
            method: 'GET',
            headers: {
                Authorization: `Bearer api.${token}`
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
                Authorization: `Bearer api.${token}`
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
                Authorization: `Bearer api.${token}`
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
                t.equals(res.statusCode, 424, 'status: 424');

                t.deepEquals(res.body, {
                    status: 424,
                    message: 'Model storage not configured',
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
                Authorization: `Bearer api.${token}`
            },
            body: {
                name: 'NAIP Supervised',
                active: true,
                model_type: 'keras_example',
                model_finetunelayer: -4,
                model_numparams: 7790949,
                model_inputshape: [240,240,4],
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

            t.deepEquals(Object.keys(res.body).sort(), ['created', 'id'], 'body');
            t.ok(res.body.id, 1, '.id: 1');

            t.end();
        });
    });

    test('GET /api/model (model)', (t) => {
        request({
            json: true,
            url: 'http://localhost:2000/api/model',
            method: 'GET',
            headers: {
                Authorization: `Bearer api.${token}`
            }
        }, (err, res) => {
            t.error(err, 'no errors');
            t.equals(res.statusCode, 200, 'status: 200');

            t.deepEquals(Object.keys(res.body).sort(), ['models'], 'body');
            t.equals(res.body.models.length, 1, '1 model');

            for (const model of res.body.models) {
                t.deepEquals(Object.keys(model).sort(), ['active', 'created', 'id', 'name', 'uid']);

                t.ok(parseInt(model.id), 'id is int');
                t.ok(parseInt(model.uid), 'uid is int');
                t.ok(model.created, 'created is present');
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
                Authorization: `Bearer api.${token}`
            }
        }, (err, res) => {
            t.error(err, 'no errors');
            t.equals(res.statusCode, 200, 'status: 200');

            t.deepEquals(Object.keys(res.body).sort(), [
                'active', 'classes', 'created', 'id', 'meta', 'model_finetunelayer', 'model_inputshape', 'model_numparams', 'model_type', 'name', 'storage', 'uid'
            ], 'body');

            delete res.body.created;

            t.deepEquals(res.body, {
                id: 1,
                active: true,
                uid: 1,
                name: 'NAIP Supervised',
                model_type: 'keras_example',
                model_finetunelayer: -4,
                model_numparams: 7790949,
                model_inputshape: [240, 240, 4],
                storage: null,
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
                Authorization: `Bearer api.${token}`
            }
        }, (err, res) => {
            t.error(err, 'no errors');
            t.equals(res.statusCode, 200, 'status: 200');

            t.deepEquals(Object.keys(res.body).sort(), [
                'active', 'classes', 'created', 'id', 'meta', 'model_finetunelayer', 'model_inputshape', 'model_numparams', 'model_type', 'name', 'storage', 'uid'
            ], 'body');

            delete res.body.created;

            t.deepEquals(res.body, {
                id: 1,
                active: true,
                uid: 1,
                name: 'NAIP Supervised',
                model_type: 'keras_example',
                model_inputshape: [240, 240, 4],
                model_finetunelayer: -4,
                model_numparams: 7790949,
                storage: null,
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
            await flight.pool.query(`
                UPDATE
                    models
                SET
                    storage = true
            `, []);
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
                    Authorization: `Bearer api.${token}`
                }
            }, (err, res) => {
                t.error(err, 'no errors');
                t.equals(res.statusCode, 200, 'status: 200');
                t.equals(res.headers['transfer-encoding'], 'chunked');

                t.end();
            });
        });
    }
}
