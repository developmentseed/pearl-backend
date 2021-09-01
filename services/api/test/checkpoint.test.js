const test = require('tape');
const request = require('request');
const Flight = require('./flight');
const { sql } = require('slonik');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

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
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    } , (err, res) => {
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
            Authorization: `Bearer ${flight.token.ingalls}`
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
            Authorization: `Bearer ${flight.token.ingalls}`
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
            Authorization: `Bearer ${flight.token.ingalls}`
        },
        body: {
            name: 'TEST',
            classes: [
                { name: 'Water', color: '#0000FF' },
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
            name: 'TEST',
            parent: null,
            project_id: 1,
            storage: false,
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
                { type: 'GeometryCollection', 'geometries': [] }
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
            Authorization: `Bearer ${flight.token.ingalls}`
        },
        body: {
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' }
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
            Authorization: `Bearer ${flight.token.ingalls}`
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
            parent: null,
            project_id: 1,
            storage: false,
            analytics: null,
            bookmarked: true,
            classes: [
                { name: 'Water', color: '#FF00FF' },
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
                { type: 'GeometryCollection', 'geometries': [] }
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
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');
        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            project_id: 1,
            parent: null,
            name: 'NEW NAME',
            bookmarked: true,
            analytics: null,
            classes: [
                { name: 'Water', color: '#FF00FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            storage: false,
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
                { type: 'GeometryCollection', 'geometries': [] }
            ]
        });

        t.end();
    });
});

test('Set Storage: true', async (t) => {
    await flight.config.pool.query(sql`
        UPDATE
            checkpoints
        SET
            storage = True
    `);

    t.end();
});

test('GET /api/project/1/checkpoint', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
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

test('GET /api/project/1/checkpoint?bookmarked=true', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint?bookmarked=true',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
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

test('GET /api/project/1/checkpoint?bookmarked=false', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint?bookmarked=false',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
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

test('POST /api/project/1/checkpoint (sort)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        },
        body: {
            name: 'TEST 2',
            classes: [
                { name: 'Water', color: '#0000FF' },
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
            id: 2,
            name: 'TEST 2',
            parent: null,
            project_id: 1,
            storage: false,
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
                { type: 'GeometryCollection', 'geometries': [] }
            ]
        });

        t.end();
    });
});

test('GET /api/project/1/checkpoint?sort=asc', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint?sort=asc',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.true(new Date(res.body.checkpoints[1].created) > new Date(res.body.checkpoints[0].created));

        t.end();
    });
});


test('GET /api/project/1/checkpoint/1/tiles - no geometry', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint/1/tiles',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, { status: 404, message: 'Checkpoint has no geometries to serve', messages: [] });

        t.end();
    });
});

test('GET /api/project/1/checkpoint/1/tiles/1/0/0.mvt - no geometry', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint/1/tiles/1/0/0.mvt',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, { status: 404, message: 'Checkpoint has no geometries to serve', messages: [] });

        t.end();
    });
});

test('POST /api/project/1/checkpoint - wrong parent', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        },
        body: {
            name: 'TEST',
            parent: 100,
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ]
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 400, 'status: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'Parent does not exist',
            messages: []
        });

        t.end();
    });
});

test('POST /api/project/1/checkpoint - parent', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        },
        body: {
            name: 'TEST',
            parent: 1,
            classes: [
                { name: 'Water', color: '#0000FF' },
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
            id: 4,
            name: 'TEST',
            parent: 1,
            project_id: 1,
            storage: false,
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
                { type: 'GeometryCollection', geometries: [] },
                { type: 'GeometryCollection', geometries: [] },
                { type: 'GeometryCollection', geometries: [] },
                { type: 'GeometryCollection', geometries: [] }
            ]
        });

        t.end();
    });
});

test('DELETE /api/project/1/checkpoint/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint/1',
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.end();
    });
});

test('DELETE /api/project/1/checkpoint/4', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint/4',
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');
        t.deepEquals(res.body, true);
        t.end();
    });
});

test('DELETE /api/project/1/checkpoint/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint/1',
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 404, 'status: 404');
        t.end();
    });
});

flight.landing(test);
