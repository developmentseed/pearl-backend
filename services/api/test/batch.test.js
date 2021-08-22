const test = require('tape');
const request = require('request');
const Flight = require('./flight');
const { sql } = require('slonik');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true)

test('POST /api/model', async (t) => {
    try {
        await flight.request({
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
        }, t);
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('POST /api/project', async (t) => {
    try {
        await flight.request({
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
        }, t);
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('GET /api/project/1/batch (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/batch',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.deepEquals(res.body, {
            total: 0,
            batch: []
        });
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('GET /api/project/1/batch/1 (does not exist)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/batch/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        });

        t.deepEquals(res.body, {
            status: 404,
            message: 'batch not found',
            messages: []
        });
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('POST /api/project/1/batch', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/batch',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'Area',
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
        }, t);

        t.ok(res.body.created);
        delete res.body.created;
        t.ok(res.body.updated);
        delete res.body.updated;

        t.deepEquals(res.body, {
            id: 1,
            uid: 1,
            project_id: 1,
            aoi: null,
            name: 'Area',
            bounds: {
                type: 'Polygon',
                coordinates: [ [ [ -79.37724530696869, 38.83428180092151 ], [ -79.37677592039108, 38.83428180092151 ], [ -79.37677592039108, 38.83455550411051 ], [ -79.37724530696869, 38.83455550411051 ], [ -79.37724530696869, 38.83428180092151 ] ] ]
            },
            completed: false,
            instance: 1
        });

    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('GET /api/project/1/instance/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/instance/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.last_update);
        delete res.body.last_update;
        t.ok(res.body.created);
        delete res.body.created;
        t.ok(res.body.token);
        delete res.body.token;

        t.deepEquals(res.body, {
            id: 1,
            batch: 1,
            project_id: 1,
            aoi_id: null,
            checkpoint_id: null,
            active: false,
            type: 'gpu',
            status: {}
        });

    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('Meta: Set instance to active', async (t) => {
    await flight.config.pool.query(sql`
        UPDATE instances
            SET active = True;
    `);
});

test('POST /api/project/1/batch', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/batch',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'Area',
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
        });

        t.deepEquals(res.body, {
            status: 400,
            message: 'Failed to update Instance, there is already an active batch instance',
            messages: []
        });

    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('Meta: Set instance to inactive', async (t) => {
    await flight.config.pool.query(sql`
        UPDATE instances
            SET active = False;
    `);
});

test('POST /api/project/1/checkpoint', async (t) => {
    try {
        await flight.request({
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
        }, t);
    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('POST /api/project/1/batch', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/batch',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'Area',
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
        }, t);

        t.ok(res.body.created);
        delete res.body.created;
        t.ok(res.body.updated);
        delete res.body.updated;

        t.deepEquals(res.body, {
            id: 2,
            uid: 1,
            project_id: 1,
            aoi: null,
            name: 'Area',
            bounds: {
                type: 'Polygon',
                coordinates: [ [ [ -79.37724530696869, 38.83428180092151 ], [ -79.37677592039108, 38.83428180092151 ], [ -79.37677592039108, 38.83455550411051 ], [ -79.37724530696869, 38.83455550411051 ], [ -79.37724530696869, 38.83428180092151 ] ] ]
            },
            completed: false,
            instance: 2
        });

    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('POST /api/project/1/batch - invalid checkpoint', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/batch',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'Area',
                checkpoint_id: 2,
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
        });
        
        t.deepEquals(res.body, {
            status: 404, message:
            'Checkpoint not found',
            messages: []
        });

    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('GET /api/project/1/instance - all instances', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/instance',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);
        
        t.ok(res.body.instances[0].created);
        delete res.body.instances[0].created;
        t.ok(res.body.instances[1].created);
        delete res.body.instances[1].created;

        t.deepEquals(res.body, {
            total: 2,
            instances: [{
                id: 1, batch: 1, active: false, type: 'gpu'
            },{
                id: 2, batch: 2, active: false, type: 'gpu'
            }]
        });

    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('GET /api/project/1/instance - batch: true', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/instance?batch=true',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);
        
        t.ok(res.body.instances[0].created);
        delete res.body.instances[0].created;
        t.ok(res.body.instances[1].created);
        delete res.body.instances[1].created;

        t.deepEquals(res.body, {
            total: 2,
            instances: [{
                id: 1, batch: 1, active: false, type: 'gpu'
            },{
                id: 2, batch: 2, active: false, type: 'gpu'
            }]
        });

    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('GET /api/project/1/instance - batch: false', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/instance?batch=false',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);
        
        t.deepEquals(res.body, {
            total: 0,
            instances: []
        });

    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('GET /api/project/1/instance - batch: 1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: 'http://localhost:2000/api/project/1/instance?batch=1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);
        
        t.ok(res.body.instances[0].created);
        delete res.body.instances[0].created;

        t.deepEquals(res.body, {
            total: 1,
            instances: [{
                id: 1, batch: 1, active: false, type: 'gpu'
            }]
        });

    } catch (err) {
        t.error(err);
    }

    t.end();
});

flight.landing(test);
