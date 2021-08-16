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


test('GET /api/project/1/instance (empty)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/instance',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(res.body, {
            total: 0,
            instances: []
        });

        t.end();
    });
});

test('POST /api/project/1/instance', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/instance',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.created, '.created: <date>');
        t.ok(res.body.last_update, '.last_update: <date>');
        t.ok(res.body.token, '.token: <str>');
        delete res.body.created;
        delete res.body.last_update;
        delete res.body.token;

        t.deepEquals(res.body, {
            id: 1,
            project_id: 1,
            is_batch: false,
            aoi_id: null,
            checkpoint_id: null,
            active: false,
            pod: {},
            type: 'gpu'
        });

        t.end();
    });
});

test('GET /api/project/1/instance (empty)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/instance',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.instances[0].created, '.instances[0].created: <date>');
        delete res.body.instances[0].created;

        t.deepEquals(res.body, {
            total: 1,
            instances: [{
                id: 1,
                active: false,
                is_batch: false,
                type: 'gpu'
            }]
        });

        t.end();
    });
});


test('PATCH /api/project/1/instance/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/instance/1',
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: {
            active: true
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.created, '.created: <date>');
        t.ok(res.body.last_update, '.last_update: <date>');
        delete res.body.created;
        delete res.body.last_update;

        t.deepEquals(res.body, {
            id: 1,
            project_id: 1,
            is_batch: false,
            aoi_id: null,
            checkpoint_id: null,
            active: true,
            type: 'gpu'
        });

        t.end();
    });
});

test('GET /api/project/1/instance?status=active', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/instance?status=active',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.instances[0].created, '.instances[0].created: <date>');
        delete res.body.instances[0].created;

        t.deepEquals(res.body, {
            total: 1,
            instances: [{
                id: 1,
                is_batch: false,
                active: true,
                type: 'gpu'
            }]
        });

        t.end();
    });
});

test('GET /api/project/1/instance', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/instance',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.instances[0].created, '.instances[0].created: <date>');
        delete res.body.instances[0].created;

        t.deepEquals(res.body, {
            total: 1,
            instances: [{
                id: 1,
                is_batch: false,
                active: true,
                type: 'gpu'
            }]
        });

        t.end();
    });
});

test('GET /api/project/1/instance/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/instance/1',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.created, '.created: <date>');
        t.ok(res.body.last_update, '.last_update: <date>');
        t.ok(res.body.token, '.token: <str>');
        delete res.body.created;
        delete res.body.last_update;
        delete res.body.token;

        t.deepEquals(res.body, {
            id: 1,
            project_id: 1,
            is_batch: false,
            aoi_id: null,
            checkpoint_id: null,
            active: true,
            status: {}
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
            name: 'Test Checkpoint',
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');
        t.end();
    });
});

test('PATCH /api/project/1/instance/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/instance/1',
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: {
            checkpoint_id: 1
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.created, '.created: <date>');
        t.ok(res.body.last_update, '.last_update: <date>');
        delete res.body.created;
        delete res.body.last_update;

        t.deepEquals(res.body, {
            id: 1,
            project_id: 1,
            is_batch: false,
            aoi_id: null,
            checkpoint_id: 1,
            active: true,
            type: 'gpu'
        });

        t.end();
    });
});


flight.landing(test);
