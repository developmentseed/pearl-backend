import test from 'tape';
import Flight from './flight';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

flight.fixture(test, 'model.json', 'ingalls');
flight.fixture(test, 'project.json', 'ingalls');

test('POST /api/project/1/checkpoint - Error: Entry for every class', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint',
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
                ],
                tagmap: {
                    1: [{
                        key: 'natural',
                        value: 'water'
                    }]
                }
            }
        }, false);

        t.deepEquals(res.body, {
            status: 400,
            message: 'OSMTag must have key entry for every class in array',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/checkpoint - Error: OSMTag missing entry', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint',
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
                ],
                tagmap: {
                    1: [{ key: 'natural', value: 'water' }],
                    2: [{ key: 'natural', value: 'water' }],
                    3: [{ key: 'natural', value: 'water' }],
                    4: [{ key: 'natural', value: 'water' }]
                }
            }
        }, false);

        t.deepEquals(res.body, {
            status: 400,
            message: 'OSMTag missing entry for Water class (Element 0)',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/checkpoint', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint',
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
                ],
                tagmap: {
                    0: [{ key: 'natural', value: 'water' }],
                    1: [{ key: 'natural', value: 'forest' }],
                    2: [{ key: 'natural', value: 'field' }],
                    3: [{ key: 'building', value: 'yes' }]
                }
            }
        }, t);

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
            osmtag_id: 1,
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
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/project/1/checkpoint/1/osmtag', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/checkpoint/1/osmtag',
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
            project_id: 1,
            tagmap: {
                0: [{ key: 'natural', value: 'water' }],
                1: [{ key: 'natural', value: 'forest' }],
                2: [{ key: 'natural', value: 'field' }],
                3: [{ key: 'building', value: 'yes' }]
            }
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
