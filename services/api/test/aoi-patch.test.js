import test from 'tape';
import Flight from './flight.js';
import fs from 'fs';
import path from 'path';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

flight.fixture(test, 'model.json', 'ingalls');


test('POST /api/project/1/aoi/1/patch - no project', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi/1/patch',
            method: 'POST',
            auth: {
                bearer: flight.token.ingalls
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');
        t.deepEquals(res.body, {
            status: 404,
            message: 'No project found',
            messages: []
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.fixture(test, 'project.json', 'ingalls');
flight.fixture(test, 'checkpoint.json', 'ingalls');

test('POST /api/project/1/aoi/1/patch - no aoi', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi/1/patch',
            method: 'POST',
            auth: {
                bearer: flight.token.ingalls
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');
        t.deepEquals(res.body, {
            status: 404, message: 'aoi not found', messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/aoi', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi',
            method: 'POST',
            auth: {
                bearer: flight.token.ingalls
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
            checkpoint_id: 1,
            bookmarked: false,
            bookmarked_at: null,
            patches: [],
            name: 'Test AOI',
            px_stats: {},
            bounds: {
                type: 'Polygon',
                coordinates: [[
                    [-79.37724530696869, 38.83428180092151],
                    [-79.37677592039108, 38.83428180092151],
                    [-79.37677592039108, 38.83455550411051],
                    [-79.37724530696869, 38.83455550411051],
                    [-79.37724530696869, 38.83428180092151]
                ]]
            },
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi/1/patch', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi/1/patch',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.deepEquals(res.body, {
            total: 0,
            project_id: 1,
            aoi_id: 1,
            patches: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/aoi/1/patch', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi/1/patch',
            method: 'POST',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            storage: false,
            project_id: 1,
            aoi_id: 1
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi/1/patch', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi/1/patch',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

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
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST: /api/project/1/aoi/1/patch/1/upload', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/patch/1/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            auth: {
                bearer: flight.token.ingalls
            },
            formData : {
                file : fs.createReadStream(new URL('./fixtures/asset', import.meta.url))
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            project_id: 1,
            aoi_id: 1,
            storage: true
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi/1/patch/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi/1/patch/1',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;
        t.deepEquals(res.body, {
            id: 1,
            storage: true,
            project_id: 1,
            aoi_id: 1
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi/1/patch/1/download', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1/patch/1/download',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, false);

        t.deepEquals(res.body, {
            note: 'This is just a file we use to test uploads'
        });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/1/aoi/1/patch/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi/1/patch/1',
            method: 'DELETE',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        t.deepEquals(res.body, {
            status: 200,
            message: 'AOI Patch Deleted'
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
            url: 'http://localhost:2000/api/project/1/aoi/1',
            method: 'PATCH',
            auth: {
                bearer: flight.token.ingalls
            },
            body: {
                patches: [1],
                bookmarked: true
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        t.ok(res.body.bookmarked_at);
        delete res.body.created;
        delete res.body.bookmarked_at;

        t.deepEquals(res.body, {
            id: 1,
            area: 1238,
            storage: false,
            project_id: 1,
            checkpoint_id: 1,
            bookmarked: true,
            px_stats: {},
            patches: [1],
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
            },
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008000' },
                { name: 'Field', color: '#80FF80' },
                { name: 'Built', color: '#806060' }
            ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/project/1/aoi/1 - update the name and check if the bookmarked value is not reset', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi/1',
            method: 'PATCH',
            auth: {
                bearer: flight.token.ingalls
            },
            body: {
                name: 'New test AOI'
            }
        }, t);

        t.ok(res.body.bookmarked_at);
        t.equals(res.body.bookmarked, true);
        t.equals(res.body.name, 'New test AOI');
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/project/1/aoi/1 - unbookmarking', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi/1',
            method: 'PATCH',
            auth: {
                bearer: flight.token.ingalls
            },
            body: {
                bookmarked: false
            }
        }, t);

        t.equals(res.body.bookmarked, false);
        t.equals(res.body.bookmarked_at, null);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/project/1/aoi/1 - update classes', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi/1',
            method: 'PATCH',
            auth: {
                bearer: flight.token.ingalls
            },
            body: {
                classes: [
                    { name: 'Water', color: '#0000FF' },
                    { name: 'Tree Canopy', color: '#008100' },
                    { name: 'Field', color: '#FFF' },
                    { name: 'Buildings', color: '#806060' }
                ]
            }
        }, t);

        t.deepEqual(
            res.body.classes,
            [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008100' },
                { name: 'Field', color: '#FFF' },
                { name: 'Buildings', color: '#806060' }
            ]
        );
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi/1 - should return the classes field updated', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi/1',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, t);

        delete res.body.created;

        t.deepEquals(res.body, {
            id: 1,
            area: 1238,
            storage: false,
            project_id: 1,
            checkpoint_id: 1,
            bookmarked: false,
            bookmarked_at: null,
            patches: [1],
            shares: [],
            name: 'New test AOI',
            px_stats: {},
            bounds: {
                type: 'Polygon',
                coordinates: [[
                    [-79.37724530696869, 38.83428180092151],
                    [-79.37677592039108, 38.83428180092151],
                    [-79.37677592039108, 38.83455550411051],
                    [-79.37724530696869, 38.83455550411051],
                    [-79.37724530696869, 38.83428180092151]
                ]]
            },
            classes: [
                { name: 'Water', color: '#0000FF' },
                { name: 'Tree Canopy', color: '#008100' },
                { name: 'Field', color: '#FFF' },
                { name: 'Buildings', color: '#806060' }
            ]
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi/1/patch/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/aoi/1/patch/1',
            method: 'GET',
            auth: {
                bearer: flight.token.ingalls
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, {
            status: 404,
            message: 'aoi_patch not found',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
