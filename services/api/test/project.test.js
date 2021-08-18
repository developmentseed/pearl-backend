const test = require('tape');
const request = require('request');
const Flight = require('./flight');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

test('GET /api/project (empty)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
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
            Authorization: `Bearer ${flight.token.ingalls}`
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
            Authorization: `Bearer ${flight.token.ingalls}`
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
            Authorization: `Bearer ${flight.token.ingalls}`
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

test('POST /api/project/1/checkpoint', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/checkpoint',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
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

test('POST /api/project/1/aoi', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1/aoi',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
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
            patches: [],
            checkpoint_id: 1,
            name: 'Test AOI',
            bookmarked: false,
            px_stats: {},
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

test('GET /api/project', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.projects[0].created, '.created: <date>');
        delete res.body.projects[0].created;
        delete res.body.projects[0].model.created

        t.deepEquals(res.body, {
            "total": 1,
            "projects": [
                {
                    "id": 1,
                    "name": "Test Project",
                    "aois": [],
                    "checkpoints": [],
                    "model": {
                        "id": 1,
                        "active": true,
                        "uid": 1,
                        "name": "NAIP Supervised",
                        "model_type": "pytorch_example",
                        "model_inputshape": [
                            240,
                            240,
                            4
                        ],
                        "model_zoom": 17,
                        "storage": false,
                        "classes": [
                            {
                                "name": "Water",
                                "color": "#0000FF"
                            },
                            {
                                "name": "Tree Canopy",
                                "color": "#008000"
                            },
                            {
                                "name": "Field",
                                "color": "#80FF80"
                            },
                            {
                                "name": "Built",
                                "color": "#806060"
                            }
                        ],
                        "meta": {},
                        "bounds": [
                            -180,
                            -90,
                            180,
                            90
                        ]
                    }
                }
            ]
        });

        t.end();
    });
});

test('POST /api/project (sort)', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project',
        method: 'POST',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        },
        body: {
            name: 'LULC Test Project',
            model_id: 1,
            mosaic: 'naip.latest'
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 2,
            uid: 1,
            name: 'LULC Test Project',
            model_id: 1,
            mosaic: 'naip.latest'
        });

        t.end();
    });
});

test('GET /api/project?sort=asc', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project?sort=asc',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');

        t.true(new Date(res.body.projects[1].created) > new Date(res.body.projects[0].created));

        t.end();
    });
});

test('GET /api/project?name=lulc', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project?name=lulc',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.error(err, 'no errors');
        t.equals(res.statusCode, 200, 'status: 200');
        delete res.body.projects[0].created;
        delete res.body.projects[0].model.created;

        t.deepEqual(res.body, {
            "total": 1,
            "projects": [
                {
                    "id": 2,
                    "name": "LULC Test Project",
                    "aois": [],
                    "checkpoints": [],
                    "model": {
                        "id": 1,
                        "active": true,
                        "uid": 1,
                        "name": "NAIP Supervised",
                        "model_type": "pytorch_example",
                        "model_inputshape": [
                            240,
                            240,
                            4
                        ],
                        "model_zoom": 17,
                        "storage": false,
                        "classes": [
                            {
                                "name": "Water",
                                "color": "#0000FF"
                            },
                            {
                                "name": "Tree Canopy",
                                "color": "#008000"
                            },
                            {
                                "name": "Field",
                                "color": "#80FF80"
                            },
                            {
                                "name": "Built",
                                "color": "#806060"
                            }
                        ],
                        "meta": {},
                        "bounds": [
                            -180,
                            -90,
                            180,
                            90
                        ]
                    }
                }
            ]
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
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            name: 'Test Project',
            model_id: 1,
            model_name: 'NAIP Supervised',
            mosaic: 'naip.latest',
            checkpoints: []
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
            Authorization: `Bearer ${flight.token.ingalls}`
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
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.equals(res.statusCode, 200, 'status: 200');

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            name: 'Renamed Test Project',
            model_id: 1,
            model_name: 'NAIP Supervised',
            mosaic: 'naip.latest',
            checkpoints: []
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

        t.deepEquals(res.body, true);

        t.end();
    });
});

test('DELETE /api/project/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1',
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.equals(res.statusCode, 200, 'status: 200');

        t.deepEquals(res.body, {});

        t.end();
    });
});

test('GET /api/project/1', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/1',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.equals(res.statusCode, 404, 'status: 404');

        t.end();
    });
});

test('DELETE /api/project/3', (t) => {
    request({
        json: true,
        url: 'http://localhost:2000/api/project/3',
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${flight.token.ingalls}`
        }
    }, (err, res) => {
        t.equals(res.statusCode, 404, 'status: 404');

        t.end();
    });
});

flight.landing(test);
