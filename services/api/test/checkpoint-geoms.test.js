const test = require('tape');
const request = require('request');
const { Flight } = require('./util');

const flight = new Flight();

flight.takeoff(test);

let token;
test('user', async (t) => {
    token = (await flight.user(t, {
        access: 'admin'
    })).token;
    t.end();
});

test('POST /api/model', (t) => {
    request({
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
            Authorization: `Bearer ${token}`
        }
    } , (err, res, body) => {
        t.error(err, 'no error');
        t.equals(res.statusCode, 200, 'status: 200');
        t.end();
    });
});

test('POST /api/project', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: {
            name: 'Test Project',
            model_id: 1,
            mosaic: 'naip.latest'
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            uid: 1,
            name: 'Test Project',
            model_id: 1,
            mosaic: 'naip.latest'
        });

        t.end();
    });
});

test('GET /api/project/1/checkpoint (empty)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');
        t.deepEquals(res.body, {
            total: 0,
            project_id: 1,
            checkpoints: []
        });

        t.end();
    });
});

test('POST /api/project/1/checkpoint', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: {
            name: 'TEST',
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            geoms: [
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
           ]
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');
        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            name: 'TEST',
            project_id: 1,
            storage: false,
            bookmarked: false,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            geoms: [
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
           ]
        });

        t.end();
    });
});

test('PATCH /api/project/1/checkpoint/1 (no class length change)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint/1',
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: {
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
            ]
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 400, 'status: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'Cannot change the number of classes once a checkpoint is created',
            messages: []
        });

        t.end();
    });
});

test('PATCH /api/project/1/checkpoint/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint/1',
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`
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
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            name: 'NEW NAME',
            project_id: 1,
            storage: false,
            bookmarked: true,
            classes: [
                { name: 'Water', color: '#FF00FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            geoms: [
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
           ]
        });

        t.end();
    });
});

test('GET /api/project/1/checkpoint/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint/1',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');
        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            project_id: 1,
            name: 'NEW NAME',
            bookmarked: true,
            classes: [
                { name: 'Water', color: '#FF00FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            storage: false,
            bounds: [ -86.8359375, 34.8859309407532, -73.828125, 51.1793429792893 ],
            center: [ -80.33203125, 43.0326369600212 ],
            geoms: [
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
           ]
        });

        t.end();
    });
});

test('Set Storage: true', async (t) => {
    await flight.pool.query(`
        UPDATE checkpoints SET storage = True
    `);

    t.end();
});

test('GET /api/project/1/checkpoint (empty)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.checkpoints[0].created, '.checkpoints[0].created: <date');
        delete res.body.checkpoints[0].created;

        t.deepEquals(res.body, {
            total: 1,
            project_id: 1,
            checkpoints: [{
                id: 1,
                name: 'NEW NAME',
                storage: true,
                bookmarked: true
            }]
        });

        t.end();
    });
});

flight.landing(test);
