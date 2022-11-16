import test from 'tape';
import Flight from './flight';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

test('GET /api/project (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            total: 0,
            projects: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1 (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.fixture(test, 'model.json', 'ingalls');

test('POST /api/project (Invalid Mosaic)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'Test Project',
                model_id: 1,
                mosaic: 'naip.fake'
            }
        }, false);

        t.equals(res.statusCode, 400, 'status: 400');

        t.deepEquals(res.body, {
            status: 400,
            message: 'Invalid Mosaic',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project',
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
        t.error(err, 'no errors');
    }

    t.end();
});

flight.fixture(test, 'checkpoint.json', 'ingalls');

test('POST /api/project/1/aoi', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi',
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
                        [-79.37724530696869, 38.83428180092151],
                        [-79.37677592039108, 38.83428180092151],
                        [-79.37677592039108, 38.83455550411051],
                        [-79.37724530696869, 38.83455550411051],
                        [-79.37724530696869, 38.83428180092151]
                    ]]
                }
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            area: 1238,
            storage: false,
            project_id: 1,
            patches: [],
            checkpoint_id: 1,
            name: 'Test AOI',
            bookmarked: false,
            bookmarked_at: null,
            px_stats: {},
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ],
            bounds: {
                type: 'Polygon',
                coordinates: [[
                    [-79.37724530696869, 38.83428180092151],
                    [-79.37677592039108, 38.83428180092151],
                    [-79.37677592039108, 38.83455550411051],
                    [-79.37724530696869, 38.83455550411051],
                    [-79.37724530696869, 38.83428180092151]
                ]]
            }
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);


        t.ok(res.body.projects[0].created, '.created: <date>');
        delete res.body.projects[0].created;
        delete res.body.projects[0].model.created;

        t.deepEquals(res.body, {
            'total': 1,
            'projects': [
                {
                    'id': 1,
                    'name': 'Test Project',
                    'aois': [],
                    'checkpoints': [],
                    'model': {
                        'id': 1,
                        'active': true,
                        'uid': 1,
                        'name': 'NAIP Supervised',
                        'model_type': 'pytorch_example',
                        osmtag_id: null,
                        'model_inputshape': [
                            240,
                            240,
                            4
                        ],
                        'model_zoom': 17,
                        'storage': false,
                        'classes': [
                            {
                                'name': 'Water',
                                'color': '#0000FF'
                            },
                            {
                                'name': 'Tree Canopy',
                                'color': '#008000'
                            },
                            {
                                'name': 'Field',
                                'color': '#80FF80'
                            },
                            {
                                'name': 'Built',
                                'color': '#806060'
                            }
                        ],
                        'meta': {},
                        'bounds': [
                            -180,
                            -90,
                            180,
                            90
                        ]
                    }
                }
            ]
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project (sort)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'LULC Test Project',
                model_id: 1,
                mosaic: 'naip.latest'
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 2,
            uid: 1,
            name: 'LULC Test Project',
            model_id: 1,
            mosaic: 'naip.latest'
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project?sort=asc', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project?sort=asc',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.true(new Date(res.body.projects[1].created) > new Date(res.body.projects[0].created));
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project?name=lulc', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project?name=lulc',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        delete res.body.projects[0].created;
        delete res.body.projects[0].model.created;

        t.deepEqual(res.body, {
            'total': 1,
            'projects': [
                {
                    'id': 2,
                    'name': 'LULC Test Project',
                    'aois': [],
                    'checkpoints': [],
                    'model': {
                        'id': 1,
                        'active': true,
                        'uid': 1,
                        'name': 'NAIP Supervised',
                        'model_type': 'pytorch_example',
                        osmtag_id: null,
                        'model_inputshape': [
                            240,
                            240,
                            4
                        ],
                        'model_zoom': 17,
                        'storage': false,
                        'classes': [
                            {
                                'name': 'Water',
                                'color': '#0000FF'
                            },
                            {
                                'name': 'Tree Canopy',
                                'color': '#008000'
                            },
                            {
                                'name': 'Field',
                                'color': '#80FF80'
                            },
                            {
                                'name': 'Built',
                                'color': '#806060'
                            }
                        ],
                        'meta': {},
                        'bounds': [
                            -180,
                            -90,
                            180,
                            90
                        ]
                    }
                }
            ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            uid: 1,
            name: 'Test Project',
            model_id: 1,
            model_name: 'NAIP Supervised',
            mosaic: 'naip.latest',
            checkpoints: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/project/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1',
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'Renamed Test Project'
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            uid: 1,
            name: 'Renamed Test Project',
            model_id: 1,
            mosaic: 'naip.latest',
            model_name: 'NAIP Supervised'
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            uid: 1,
            name: 'Renamed Test Project',
            model_id: 1,
            model_name: 'NAIP Supervised',
            mosaic: 'naip.latest',
            checkpoints: []
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/1/checkpoint/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint/1',
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            status: 200,
            message: 'Checkpoint deleted'
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1',
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            status: 200,
            message: 'Project Deleted'
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/3', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/3',
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
