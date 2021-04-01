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

test('GET /api/project/1/aoi (empty)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi',
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
            aois: []
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

test('GET /api/project/1/aoi/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1',
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
            storage: false,
            project_id: 1,
            checkpoint_id: 1,
            bookmarked: false,
            name: 'Test AOI',
            bounds: {
                type: 'Polygon',
                coordinates: [ [ [ -79.377245307, 38.834281801 ], [ -79.37677592, 38.834281801 ], [ -79.37677592, 38.834555504 ], [ -79.377245307, 38.834555504 ], [ -79.377245307, 38.834281801 ] ] ]
            }
        });

        t.end();
    });
});

test('[meta] Set model.storage: true', async (t) => {
    try {
        await flight.pool.query(`
            UPDATE
                aois
            SET
                storage = true
        `, []);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');
        t.ok(res.body.aois[0].created, '.aois[0].created: <date>');
        delete res.body.aois[0].created;

        t.deepEquals(res.body, {
            total: 1,
            project_id: 1,
            aois: [{
                id: 1,
                name: 'Test AOI',
                storage: true
            }]
        });

        t.end();
    });
});

// The following 2 tests are skipped as they can't run without
// TiTiler running as well - should add something like this to flow.test.js

//let url;
test.skip('GET /api/project/1/aoi/1/tiles', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1/tiles',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        url = res.body.tiles[0];

        t.end();
    });
});

test.skip('GET /api/project/1/aoi/1/tiles/9/143/195', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000' + url.replace('{z}', 9).replace('{x}', '143').replace('{y}', '195'),
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        fs.writeFileSync('/tmp/sample.png', res.body);
        t.ok(true, 'ok - written png to /tmp/sample.png');

        t.end();
    });
});

test('PATCH /api/project/1/aoi/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1',
        method: 'PATCH',
        body: {
            bookmarked: true,
            name: 'RENAMED'
        },
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
            storage: true,
            project_id: 1,
            checkpoint_id: 1,
            bookmarked: true,
            name: 'RENAMED',
        });

        t.end();
    });
});

test('DELETE /api/project/1/aoi/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi/1',
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');

        t.deepEquals(res.body, true);

        t.end();
    });
});

flight.landing(test);
