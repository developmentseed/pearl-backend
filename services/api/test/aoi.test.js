import test from 'tape';
import Flight from './flight.js';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

flight.fixture(test, 'model.json', 'ingalls');
flight.fixture(test, 'project.json', 'ingalls');

test('GET /api/project/1/aoi (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.deepEquals(res.body, {
            total: 0,
            project_id: 1,
            aois: []
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
            bounds: {
                type: 'Polygon',
                bounds: [
                    -79.37724530696869,
                    38.83428180092151,
                    -79.37677592039108,
                    38.83455550411051
                ],
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

test('GET /api/project/1/aoi/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        delete res.body.created;
        t.ok(res.body.updated, '.updated: <date>');
        delete res.body.updated;

        t.deepEquals(res.body, {
            id: 1,
            area: 1238,
            bounds: {
                type: 'Polygon',
                bounds: [
                    -79.37724530696869,
                    38.83428180092151,
                    -79.37677592039108,
                    38.83455550411051
                ],
                coordinates: [[
                    [-79.37724530696869, 38.83428180092151],
                    [-79.37677592039108, 38.83428180092151],
                    [-79.37677592039108, 38.83455550411051],
                    [-79.37724530696869, 38.83455550411051],
                    [-79.37724530696869, 38.83428180092151]
                ]]
            },
            project_id: 1,
            name: 'Test AOI'
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/aoi', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.aois[0].created, '.aois[0].created: <date>');
        t.ok(res.body.aois[0].updated, '.aois[0].updated: <date>');

        delete res.body.aois[0].created;
        delete res.body.aois[0].updated;

        t.equals(res.body.total, 1);
        t.equals(res.body.project_id, 1);
        t.equals(res.body.aois.length, 1);
        t.equals(res.body.aois[0].id, 1);
        t.equals(res.body.aois[0].name, 'Test AOI');
        t.deepEquals(res.body.aois[0].bounds, {
            type: 'Polygon',
            bounds: [
                -79.37724530696869,
                38.83428180092151,
                -79.37677592039108,
                38.83455550411051
            ],
            coordinates: [[
                [-79.37724530696869, 38.83428180092151],
                [-79.37677592039108, 38.83428180092151],
                [-79.37677592039108, 38.83455550411051],
                [-79.37724530696869, 38.83455550411051],
                [-79.37724530696869, 38.83428180092151]
            ]]
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
            body: {
                name: 'RENAMED'
            },
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
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
            name: 'RENAMED',
            bounds: {
                type: 'Polygon',
                bounds: [
                    -79.37724530696869,
                    38.83428180092151,
                    -79.37677592039108,
                    38.83455550411051
                ],
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
                name: 'Test AOI 2',
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
            id: 2,
            area: 1238,
            project_id: 1,
            name: 'Test AOI 2',
            bounds: {
                type: 'Polygon',
                bounds: [
                    -79.37724530696869,
                    38.83428180092151,
                    -79.37677592039108,
                    38.83455550411051
                ],
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

test('GET /api/project/1/aoi?sort=asc', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi?sort=asc',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.equals(res.statusCode, 200, 'status: 200');

        t.true(new Date(res.body.aois[1].created) > new Date(res.body.aois[0].created));
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('DELETE /api/project/1/aoi/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi/1',
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            status: 200,
            message: 'AOI Deleted'
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

// after delete there should only be 1 aoi
test('GET /api/project/1/aoi?sort=asc', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/aoi?sort=asc',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.equals(res.body.total, 1);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
