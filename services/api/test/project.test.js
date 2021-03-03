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

test('GET /api/project (empty)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(res.body, {
            total: 0,
            projects: []
        });

        t.end();
    });
});

test('GET /api/project/1 (empty)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 404, 'status: 404');
        t.end();
    });
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

test('POST /api/project (Invalid Mosaic)', (t) => {
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
            mosaic: 'naip.fake'
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 400, 'status: 400');

        t.deepEquals(res.body, {
            status: 400,
            message: 'Invalid Mosaic',
            messages: []
        });

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

test('GET /api/project', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.projects[0].created, '.created: <date>');
        delete res.body.projects[0].created;

        t.deepEquals(res.body, {
            total: 1,
            projects: [{
                id: 1,
                name: 'Test Project'
            }]
        });

        t.end();
    });
});

test('GET /api/project/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            name: 'Test Project',
            model_id: 1,
            mosaic: 'naip.latest'
        });

        t.end();
    });
});

test('PATCH /api/project/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1',
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: {
            name: 'Renamed Test Project'
        }
    }, (err, res) => {
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            uid: 1,
            name: 'Renamed Test Project',
            model_id: 1,
            mosaic: 'naip.latest'
        });

        t.end();
    });
});

test('GET /api/project/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            name: 'Renamed Test Project',
            model_id: 1,
            mosaic: 'naip.latest'
        });

        t.end();
    });
});

flight.landing(test);
