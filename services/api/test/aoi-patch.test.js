const test = require('tape');
const request = require('request');
const { Flight } = require('./util');
const fs = require('fs');

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

test('POST /api/project/1/aoi/1/patch - no project', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1/patch',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 404, 'status: 404');
        t.deepEquals(res.body, {
            status: 404, message: 'No project found', messages: []
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
        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            storage: false,
            project_id: 1,
            parent: null,
            name: 'Test Checkpoint',
            analytics: null,
            bookmarked: false,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] },
                { type: 'MultiPoint', coordinates: [] }
            ],
            input_geoms: [
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] },
                { type: 'GeometryCollection', 'geometries': [] },
           ]
        });

        t.end();
    });
});

test('POST /api/project/1/aoi/1/patch - no aoi', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1/patch',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 404, 'status: 404');
        t.deepEquals(res.body, {
            status: 404, message: 'AOI not found', messages: []
        });

        t.end();
    });
});

test('POST /api/project/1/aoi', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: {
            name: 'Test AOI',
            checkpoint_id: 1,
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
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');
        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            storage: false,
            project_id: 1,
            checkpoint_id: 1,
            bookmarked: false,
            patches: [],
            name: 'Test AOI',
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
        });

        t.end();
    });
});

test('GET /api/project/1/aoi/1/patch', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1/patch',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');

        t.equals(res.statusCode, 200, 'status: 200');
        t.deepEquals(res.body, { total: 0, project_id: 1, aoi_id: 1, patches: [] });
        t.end();
    });
});

test('POST /api/project/1/aoi/1/patch', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1/patch',
        method: 'POST',
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
            storage: false,
            project_id: 1,
            aoi_id: 1
        });

        t.end();
    });
});

test('GET /api/project/1/aoi/1/patch', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1/patch',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');

        t.equals(res.statusCode, 200, 'status: 200');
        t.ok(res.body.patches[0].created, '.patches[0].created: <date>');
        delete res.body.patches[0].created;

        t.deepEquals(res.body, {
            total: 1,
            project_id: 1,
            aoi_id: 1,
            patches: [{
                id: 1,
                storage: false
            }]
        });
        t.end();
    });
});

test('[meta] Set aoi-patch.storage: true', async (t) => {
    try {
        await flight.pool.query(`
            UPDATE
                aoi_patch
            SET
                storage = true
        `, []);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi/1/patch/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1/patch/1',
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
            id: 1, storage: true, project_id: 1, aoi_id: 1
        });
        t.end();
    });
});

test('DELETE /api/project/1/aoi/1/patch/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1/patch/1',
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');

        t.equals(res.statusCode, 200, 'status: 200');
        t.deepEquals(res.body, true);

        t.end();
    });
});

test('PATCH /api/project/1/aoi/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1',
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: {
            patches: [1]
        }
    }, (err, res) => {
        t.error(err, 'no errors');

        t.equals(res.statusCode, 200, 'status: 200');
        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            storage: false,
            project_id: 1,
            checkpoint_id: 1,
            bookmarked: false,
            patches: [1],
            name: 'Test AOI'
        });
        t.end();
    });
});

test('GET /api/project/1/aoi/1/patch/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1/patch/1',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');

        t.equals(res.statusCode, 404, 'status: 404');
        t.deepEquals(res.body, {
            status: 404, message: 'AOI Patch not found', messages: []
        });
        t.end();
    });
});

flight.landing(test);
