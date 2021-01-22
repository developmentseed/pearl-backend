const test = require('tape');
const request = require('request');
const { Flight } = require('./util');

const flight = new Flight();

main();

async function main() {
    flight.takeoff(test);

    const token = await flight.user(test);

    test('GET /api/model (empty)', (t) => {
        request({
            json: true,
            url: 'http://localhost:2000/api/model',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
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

    test('POST /api/model', (t) => {
        request({
            json: true,
            url: 'http://localhost:2000/api/model',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: {
                name: 'NAIP Supervised',
                active: true,
                model_type: 'keras_example',
                model_finetunelayer: -4,
                model_numparams: 7790949,
                model_inputshape: [240,240,4],
                classes: [
                    { name: 'Water', color: '#0000FF'},
                    { name: 'Tree Canopy', color: '#008000'},
                    { name: 'Field', color: '#80FF80'},
                    { name: 'Built', color: '#806060'}
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
                Authorization: `Bearer ${token}`
            }
        }, (err, res) => {
            t.error(err, 'no errors');
            t.equals(res.statusCode, 200, 'status: 200');

            t.deepEquals(Object.keys(res.body).sort(), ['models'], 'body');
            t.equals(res.body.models.length, 1, '1 model');

            for (const model of res.body.models) {
                t.ok(parseInt(model.id), 'id is int');
                t.ok(model.created, 'created is present');
                t.ok(model.active, 'model is active');
                t.ok(model.name, 'name is present');
            }

            t.end();
        });
    });



    flight.landing(test);
}
