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
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
            ],
            input_geoms: [
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] }, { type: 'Polygon', coordinates: [ [ [ -79.38049077987671, 38.83848752076715 ], [ -79.37873125076294, 38.83848752076715 ], [ -79.37873125076294, 38.8397243269996 ], [ -79.38049077987671, 38.8397243269996 ], [ -79.38049077987671, 38.83848752076715 ] ] ] } ] },
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] } ]},
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] } ]},
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] } ]}
            ],
            analytics: [
                { counts: 1, f1score: 1, percent: 1 },
                { counts: 2, f1score: 2, percent: 2 },
                { counts: 3, f1score: 3, percent: 3 },
                { counts: 4, f1score: 4, percent: 4 }
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
            parent: null,
            storage: false,
            bookmarked: false,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
            ],
            input_geoms: [
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] }, { type: 'Polygon', coordinates: [ [ [ -79.38049077987671, 38.83848752076715 ], [ -79.37873125076294, 38.83848752076715 ], [ -79.37873125076294, 38.8397243269996 ], [ -79.38049077987671, 38.8397243269996 ], [ -79.38049077987671, 38.83848752076715 ] ] ] } ] },
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] } ]},
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] } ]},
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] } ]}
            ],
            analytics: [
                { counts: 1, f1score: 1, percent: 1 },
                { counts: 2, f1score: 2, percent: 2 },
                { counts: 3, f1score: 3, percent: 3 },
                { counts: 4, f1score: 4, percent: 4 }
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
            parent: null,
            classes: [
                { name: 'Water', color: '#FF00FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
            ],
            input_geoms: [
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] }, { type: 'Polygon', coordinates: [ [ [ -79.38049077987671, 38.83848752076715 ], [ -79.37873125076294, 38.83848752076715 ], [ -79.37873125076294, 38.8397243269996 ], [ -79.38049077987671, 38.8397243269996 ], [ -79.38049077987671, 38.83848752076715 ] ] ] } ] },
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] } ]},
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] } ]},
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] } ]}
            ],
            analytics: [
                { counts: 1, f1score: 1, percent: 1 },
                { counts: 2, f1score: 2, percent: 2 },
                { counts: 3, f1score: 3, percent: 3 },
                { counts: 4, f1score: 4, percent: 4 }
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
            parent: null,
            classes: [
                { name: 'Water', color: '#FF00FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            storage: false,
            bounds: [ -86.8359375, 34.8859309407532, -73.828125, 51.1793429792893 ],
            center: [ -80.33203125, 43.0326369600212 ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
            ],
            input_geoms: [
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] }, { type: 'Polygon', coordinates: [ [ [ -79.38049077987671, 38.83848752076715 ], [ -79.37873125076294, 38.83848752076715 ], [ -79.37873125076294, 38.8397243269996 ], [ -79.38049077987671, 38.8397243269996 ], [ -79.38049077987671, 38.83848752076715 ] ] ] } ] },
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] } ]},
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] } ]},
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] } ]}
            ],
            analytics: [
                { counts: 1, f1score: 1, percent: 1 },
                { counts: 2, f1score: 2, percent: 2 },
                { counts: 3, f1score: 3, percent: 3 },
                { counts: 4, f1score: 4, percent: 4 }
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

test('GET /api/project/1/checkpoint', (t) => {
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
                parent: null,
                name: 'NEW NAME',
                storage: true,
                bookmarked: true
            }]
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
            parent: 1,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
            ],
            input_geoms: [
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] }, { type: 'Polygon', coordinates: [ [ [ -79.38049077987671, 38.83848752076715 ], [ -79.37873125076294, 38.83848752076715 ], [ -79.37873125076294, 38.8397243269996 ], [ -79.38049077987671, 38.8397243269996 ], [ -79.38049077987671, 38.83848752076715 ] ] ] } ] },
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] } ]},
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] } ]},
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] } ]}
            ],
            analytics: [
                { counts: 1, f1score: 1, percent: 1 },
                { counts: 2, f1score: 2, percent: 2 },
                { counts: 3, f1score: 3, percent: 3 },
                { counts: 4, f1score: 4, percent: 4 }
            ]
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');
        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 2,
            name: 'TEST',
            project_id: 1,
            parent: 1,
            storage: false,
            bookmarked: false,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            retrain_geoms: [
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] },
                { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] },
            ],
            input_geoms: [
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] }, { type: 'Polygon', coordinates: [ [ [ -79.38049077987671, 38.83848752076715 ], [ -79.37873125076294, 38.83848752076715 ], [ -79.37873125076294, 38.8397243269996 ], [ -79.38049077987671, 38.8397243269996 ], [ -79.38049077987671, 38.83848752076715 ] ] ] } ] },
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] } ]},
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ], [ -73.828125, 51.17934297928927 ]] } ]},
                { type: 'GeometryCollection', 'geometries': [ { type: 'MultiPoint', coordinates: [ [ -86.8359375, 34.88593094075317 ]] } ]}
            ],
            analytics: [
                { counts: 1, f1score: 1, percent: 1 },
                { counts: 2, f1score: 2, percent: 2 },
                { counts: 3, f1score: 3, percent: 3 },
                { counts: 4, f1score: 4, percent: 4 }
            ]
        });

        t.end();
    });
});

test('GET /api/project/1/checkpoint/1/tiles - geometries', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint/1/tiles',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(res.body, {
            tilejson: '2.2.0',
            name: 'checkpoint-1',
            version: '1.0.0',
            schema: 'xyz',
            tiles: [ '/project/1/checkpoint/1/tiles/{z}/{x}/{y}.mvt' ],
            bounds: [ -86.8359375, 34.8859309407532, -73.828125, 51.1793429792893 ],
            center: [ -80.33203125, 43.0326369600212 ]
        });

        t.end();
    });
});

test('GET /api/project/1/checkpoint/1/tiles/1/0/0 - geometries', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint/1/tiles/1/0/0.mvt',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(Buffer.from(res.body).toString('hex'), '1aefbfbd010a0464617461120f0801120200001801220509efbfbd21efbfbd3212130801120200011801220911efbfbd21efbfbd32efbfbd04efbfbd0712130801120200021801220911efbfbd21efbfbd32efbfbd04efbfbd07120f0801120200031801220509efbfbd21efbfbd32120f0802120200001801220509efbfbd21efbfbd3212130802120200011801220911efbfbd21efbfbd32efbfbd04efbfbd0712130802120200021801220911efbfbd21efbfbd32efbfbd04efbfbd07120f0802120200031801220509efbfbd21efbfbd321a05636c6173732202280122022802220228032202280428efbfbd207802');

        t.end();
    });
});

flight.landing(test);
