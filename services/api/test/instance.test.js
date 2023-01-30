import test from 'tape';
import Flight from './flight.js';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls', true);

flight.fixture(test, 'model.json', 'ingalls');
flight.fixture(test, 'project.json', 'ingalls');

test('GET /api/project/1/instance (empty)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/instance',
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
        t.error(err, 'no error');
    }

    t.end();
});

test('POST /api/project/1/instance', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/instance',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        t.ok(res.body.last_update, '.last_update: <date>');
        t.ok(res.body.token, '.token: <str>');
        delete res.body.created;
        delete res.body.last_update;
        delete res.body.token;

        t.deepEquals(res.body, {
            id: 1,
            project_id: 1,
            batch: null,
            timeframe_id: null,
            checkpoint_id: null,
            active: false,
            pod: {},
            type: 'cpu'
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET /api/project/1/instance?status=all', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/instance?status=all',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.instances[0].created, '.instances[0].created: <date>');
        delete res.body.instances[0].created;

        t.deepEquals(res.body, {
            total: 1,
            instances: [{
                id: 1,
                active: false,
                batch: null,
                type: 'cpu'
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET /api/project/1/instance?status=inactive', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/instance?status=inactive',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.instances[0].created, '.instances[0].created: <date>');
        delete res.body.instances[0].created;

        t.deepEquals(res.body, {
            total: 1,
            instances: [{
                id: 1,
                active: false,
                batch: null,
                type: 'cpu'
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET /api/project/1/instance?status=active', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/instance?status=active',
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
        t.error(err, 'no error');
    }

    t.end();
});

test('PATCH /api/project/1/instance/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/instance/1',
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                active: true
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        t.ok(res.body.last_update, '.last_update: <date>');
        t.ok(res.body.token, '.token: <string>');
        delete res.body.created;
        delete res.body.last_update;
        delete res.body.token;

        t.deepEquals(res.body, {
            id: 1,
            project_id: 1,
            batch: null,
            timeframe_id: null,
            checkpoint_id: null,
            status: {},
            pod: {},
            active: true,
            type: 'cpu'
        });

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('PATCH /api/project/1/instance/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/instance/1',
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                active: false
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        t.ok(res.body.last_update, '.last_update: <date>');
        t.ok(res.body.token, '.token: <string>');
        delete res.body.created;
        delete res.body.last_update;
        delete res.body.token;

        t.deepEquals(res.body, {
            id: 1,
            status: {},
            pod: {},
            project_id: 1,
            batch: null,
            timeframe_id: null,
            checkpoint_id: null,
            active: false,
            type: 'cpu'
        });

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('PATCH /api/project/1/instance/1', async (t) => {
    try {
        await flight.request({
            json: true,
            url: '/api/project/1/instance/1',
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                active: true
            }
        }, t);
    } catch (err) {
        t.error(err, 'no error');
    }
    t.end();
});

test('GET /api/project/1/instance?status=active', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/instance?status=active',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.instances[0].created, '.instances[0].created: <date>');
        delete res.body.instances[0].created;

        t.deepEquals(res.body, {
            total: 1,
            instances: [{
                id: 1,
                batch: null,
                active: true,
                type: 'cpu'
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET /api/project/1/instance', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/instance',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.instances[0].created, '.instances[0].created: <date>');
        delete res.body.instances[0].created;

        t.deepEquals(res.body, {
            total: 1,
            instances: [{
                id: 1,
                active: true,
                batch: null,
                type: 'cpu'
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET /api/project/1/instance?type=gpu', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/instance?type=gpu',
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
        t.error(err, 'no error');
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

        t.ok(res.body.created, '.created: <date>');
        t.ok(res.body.last_update, '.last_update: <date>');
        t.ok(res.body.token, '.token: <str>');
        delete res.body.created;
        delete res.body.last_update;
        delete res.body.token;

        t.deepEquals(res.body, {
            id: 1,
            type: 'cpu',
            project_id: 1,
            batch: null,
            timeframe_id: null,
            checkpoint_id: null,
            active: true,
            status: {},
            pod: {}
        });

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET /api/instance/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/instance/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        t.ok(res.body.last_update, '.last_update: <date>');
        t.ok(res.body.token, '.token: <str>');
        delete res.body.created;
        delete res.body.last_update;
        delete res.body.token;

        t.deepEquals(res.body, {
            id: 1,
            type: 'cpu',
            project_id: 1,
            batch: null,
            timeframe_id: null,
            checkpoint_id: null,
            active: true,
            status: {},
            pod: {}
        });

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

flight.fixture(test, 'checkpoint.json', 'ingalls');

test('PATCH /api/project/1/instance/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/project/1/instance/1',
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                checkpoint_id: 1
            }
        }, t);

        t.ok(res.body.created, '.created: <date>');
        t.ok(res.body.last_update, '.last_update: <date>');
        t.ok(res.body.token, '.token: <string>');
        delete res.body.created;
        delete res.body.last_update;
        delete res.body.token;

        t.deepEquals(res.body, {
            id: 1,
            project_id: 1,
            status: {},
            pod: {},
            batch: null,
            timeframe_id: null,
            checkpoint_id: 1,
            active: true,
            type: 'cpu'
        }, t);

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});


flight.landing(test);
