import test from 'tape';
import Flight from './flight.js';

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

test('PATCH /api/model/1 - storage: false, active: false', async (t) => {
    try {
        await flight.request({
            json: true,
            url: '/api/model/1',
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                storage: false,
                active: true
            }
        }, t);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project - Model not uploaded', async (t) => {
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
                model_id: 1
            }
        }, false);

        t.deepEquals(res.body, {
            status: 400,
            message:'Model has not been uploaded',
            messages:[]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/model/1 - storage: true, active: false', async (t) => {
    try {
        await flight.request({
            json: true,
            url: '/api/model/1',
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                storage: true,
                active: false
            }
        }, t);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project - Model not active', async (t) => {
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
                model_id: 1
            }
        }, false);

        t.deepEquals(res.body, {
            status: 400,
            message:'Model has not been set as active',
            messages:[]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/model/1 - storage: true, active: true', async (t) => {
    try {
        await flight.request({
            json: true,
            url: '/api/model/1',
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                storage: true,
                active: true
            }
        }, t);
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
                model_id: 1
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            uid: 1,
            name: 'Test Project',
            model_id: 1,
            model_name: 'NAIP Supervised'
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
        t.ok(res.body.updated, '.updated: <date>');
        delete res.body.updated;

        t.deepEquals(res.body, {
            id: 1,
            area: 1238,
            project_id: 1,
            name: 'Test AOI',
            bookmarked: false,
            bookmarked_at: null,
            bounds: {
                type: 'Polygon',
                bounds: [-79.37724530696869, 38.83428180092151, -79.37677592039108, 38.83455550411051],
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
            total: 1,
            projects: [{
                id: 1,
                name: 'Test Project',
                aois: [],
                checkpoints: [],
                model: {
                    id: 1,
                    active: true,
                    uid: 1,
                    name: 'NAIP Supervised',
                    model_type: 'pytorch_example',
                    imagery_source_id: 1,
                    osmtag_id: null,
                    model_inputshape: [240, 240, 4],
                    model_zoom: 17,
                    storage: true,
                    classes: [
                        { 'name': 'Water', 'color': '#0000FF' },
                        { 'name': 'Tree Canopy', 'color': '#008000' },
                        { 'name': 'Field', 'color': '#80FF80' },
                        { 'name': 'Built', 'color': '#806060' }
                    ],
                    meta: {},
                    bounds: [-180, -90, 180, 90]
                }
            }]
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/project/1/aoi/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1',
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                bookmarked: true
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;
        t.ok(res.body.updated, '.updated: <date>');
        delete res.body.updated;
        t.ok(res.body.bookmarked_at, '.bookmarked_at: <date>');
        delete res.body.bookmarked_at;

        t.deepEquals(res.body, {
            id: 1,
            area: 1238,
            project_id: 1,
            name: 'Test AOI',
            bookmarked: true,
            bounds: {
                type: 'Polygon',
                bounds: [-79.37724530696869, 38.83428180092151, -79.37677592039108, 38.83455550411051],
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

        delete res.body.projects[0].aois[0].created;
        delete res.body.projects[0].aois[0].updated;

        t.deepEquals(res.body, {
            total: 1,
            projects: [{
                id: 1,
                name: 'Test Project',
                aois: [{
                    id: 1,
                    area: 1238,
                    name: 'Test AOI',
                    bounds: {
                        type: 'Polygon',
                        bounds: [-79.37724530696869, 38.83428180092151, -79.37677592039108, 38.83455550411051],
                        coordinates: [[
                            [-79.37724530696869, 38.83428180092151],
                            [-79.37677592039108, 38.83428180092151],
                            [-79.37677592039108, 38.83455550411051],
                            [-79.37724530696869, 38.83455550411051],
                            [-79.37724530696869, 38.83428180092151]
                        ]]
                    }
                }],
                checkpoints: [],
                model: {
                    id: 1,
                    active: true,
                    uid: 1,
                    name: 'NAIP Supervised',
                    model_type: 'pytorch_example',
                    osmtag_id: null,
                    imagery_source_id: 1,
                    model_inputshape: [240, 240, 4],
                    model_zoom: 17,
                    storage: true,
                    classes: [
                        { 'name': 'Water', 'color': '#0000FF' },
                        { 'name': 'Tree Canopy', 'color': '#008000' },
                        { 'name': 'Field', 'color': '#80FF80' },
                        { 'name': 'Built', 'color': '#806060' }
                    ],
                    meta: {},
                    bounds: [-180, -90, 180, 90]
                }
            }]
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
                model_id: 1
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 2,
            uid: 1,
            name: 'LULC Test Project',
            model_id: 1,
            model_name: 'NAIP Supervised'
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
                        id: 1,
                        active: true,
                        uid: 1,
                        name: 'NAIP Supervised',
                        model_type: 'pytorch_example',
                        imagery_source_id: 1,
                        osmtag_id: null,
                        model_inputshape: [ 240, 240, 4 ],
                        model_zoom: 17,
                        storage: true,
                        classes: [
                            { name: 'Water',          color: '#0000FF' },
                            { name: 'Tree Canopy',    color: '#008000' },
                            { name: 'Field',          color: '#80FF80' },
                            { name: 'Built',          color: '#806060' }
                        ],
                        meta: {},
                        bounds: [ -180, -90, 180, 90 ]
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
