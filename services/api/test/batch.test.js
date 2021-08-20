const test = require('tape');
const request = require('request');
const Flight = require('./flight');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true)

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
        t.error(err);
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
        t.error(err);
    }

    t.end();
});

test('GET /api/project/1/batch (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/batch',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            total: 0,
            batch: []
        });
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('GET /api/project/1/batch/1 (does not exist)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/batch/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        });

        t.deepEquals(res.body, {
            status: 404,
            message: 'batch not found',
            messages: []
        });
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('POST /api/project/1/batch', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/batch',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'Area',
                bounds: {
                    type: 'Polygon',
                    coordinates: [[
                        [ -79.37724530696869, 38.83428180092151 ],
                        [ -79.37677592039108, 38.83428180092151 ],
                        [ -79.37677592039108, 38.83455550411051 ],
                        [ -79.37724530696869, 38.83455550411051 ],
                        [ -79.37724530696869, 38.83428180092151 ]
                    ]]
                }
            }
        });

        t.deepEquals(res.body, {
            status: 404,
            message: 'batch not found',
            messages: []
        });
    } catch (err) {
        t.error(err);
    }

    t.end();
});

flight.landing(test);
