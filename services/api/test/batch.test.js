import test from 'tape';
import Flight from './flight.js';
import { sql } from 'slonik';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

flight.fixture(test, 'model.json', 'ingalls');
flight.fixture(test, 'project.json', 'ingalls');
flight.fixture(test, 'checkpoint.json', 'ingalls');
flight.fixture(test, 'aoi.json', 'ingalls');

test('GET /api/project/1/batch (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/batch',
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
            url: '/api/project/1/batch/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.deepEquals(res.body, {
            status: 404,
            message: 'Batch not found',
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
            url: '/api/project/1/batch',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                aoi: 1,
                mosaic: 'naip.latest'
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;
        t.ok(res.body.updated);
        delete res.body.updated;

        t.ok(res.body.mosaic && typeof res.body.mosaic === 'object');
        delete res.body.mosaic;
        t.ok(res.body.aoi && typeof res.body.aoi === 'object');
        delete res.body.aoi;

        t.deepEquals(res.body, {
            id: 1,
            uid: 1,
            project_id: 1,
            progress: 0,
            timeframe: null,
            abort: false,
            error: null,
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
            url: '/api/project/1/instance/1',
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
            timeframe_id: null,
            checkpoint_id: null,
            active: false,
            type: 'cpu',
            pod: {},
            status: {}
        });

    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('Meta: Set instance to active', async (t) => {
    try {
        await flight.config.pool.query(sql`
            UPDATE instances
                SET active = True;
        `);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/batch', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/batch',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                aoi: 1,
                mosaic: 'naip.latest'
            }
        }, false);

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
    try {
        await flight.config.pool.query(sql`
            UPDATE instances
                SET active = False;
        `);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/project/1/checkpoint', async (t) => {
    try {
        await flight.request({
            json: true,
            url: '/api/project/1/checkpoint',
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
                ]
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
            url: '/api/project/1/batch',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                aoi: 1,
                mosaic: 'naip.latest'
            }
        }, t);

        t.ok(res.body.created);
        delete res.body.created;
        t.ok(res.body.updated);
        delete res.body.updated;

        t.ok(res.body.mosaic && typeof res.body.mosaic === 'object');
        delete res.body.mosaic;
        t.ok(res.body.aoi && typeof res.body.aoi === 'object');
        delete res.body.aoi;

        t.deepEquals(res.body, {
            id: 2,
            uid: 1,
            project_id: 1,
            progress: 0,
            timeframe: null,
            abort: false,
            error: null,
            completed: false,
            instance: 2
        });

    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('GET /api/project/1/instance?status=all - all instances', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/instance?status=all',
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
                id: 1, batch: 1, active: false, type: 'cpu'
            },{
                id: 2, batch: 2, active: false, type: 'cpu'
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
            url: '/api/project/1/instance?batch=true&status=all',
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
                id: 1, batch: 1, active: false, type: 'cpu'
            },{
                id: 2, batch: 2, active: false, type: 'cpu'
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
            url: '/api/project/1/instance?batch=false',
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
            url: '/api/project/1/instance?batch=1&status=all',
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
                id: 1,
                batch: 1,
                active: false,
                type: 'cpu'
            }]
        });

    } catch (err) {
        t.error(err);
    }

    t.end();
});

test('GET /api/project/1/batch', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/batch',
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
test('GET /api/project/1/batch (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/batch',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        for (const batch of res.body.batch) {
            t.ok(batch.created);
            delete batch.created;
            t.ok(batch.updated);
            delete batch.updated;

            t.ok(batch.mosaic && typeof batch.mosaic === 'object');
            delete batch.mosaic;
            t.ok(batch.aoi && typeof batch.aoi === 'object');
            delete batch.aoi;
        }

        t.deepEquals(res.body, {
            total: 2,
            batch: [{
                id: 1, completed: false, progress: 0, abort: false, error: null, timeframe: null
            },{
                id: 2, completed: false, progress: 0, abort: false, error: null, timeframe: null
            }]
        });
    } catch (err) {
        t.error(err);
    }

    t.end();
});

flight.landing(test);
