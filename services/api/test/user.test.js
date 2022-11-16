/* eslint-disable strict */
import test from 'tape';
import Flight from './flight';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);
flight.user(test, 'ingalls');
flight.user(test, 'admin', true);

test('GET /api/user/me (valid token - 200 success)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/user/me',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, t);

        t.ok(res.body.created);
        delete (res.body.created);
        t.ok(res.body.updated);
        delete (res.body.updated);

        t.deepEquals(res.body, {
            id: 1,
            username: 'ingalls',
            email: 'ingalls@example.com',
            access: 'user',
            flags: {}
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/user/me (public)', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/user/me',
            method: 'GET'
        }, false);

        t.equals(res.statusCode, 401, 'status: 401');

        t.deepEquals(res.body, {
            status: 401,
            message: 'Authentication Required',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/login', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/login',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            }
        }, false);

        t.equals(res.statusCode, 404, 'status: 404');

        t.deepEquals(res.body, {
            status: 404,
            message: 'API endpoint does not exist!'
        }, false);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('POST /api/token', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/token',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${flight.token.ingalls}`
            },
            body: {
                name: 'API Token'
            }
        }, false);

        t.equals(res.statusCode, 400, 'status: 404');

        t.deepEquals(res.body, { status: 400, message: 'Only an Auth0 token can create a API token', messages: [] });

    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/user', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/user',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.admin}`
            },
            body: {
                name: 'API Token'
            }
        }, t);

        t.deepEquals(res.body.total, 2);
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/user/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/user/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.admin}`
            }
        }, t);

        t.ok(res.body.created);
        delete (res.body.created);
        t.ok(res.body.updated);
        delete (res.body.updated);

        t.deepEquals(res.body, {
            id: 1,
            username: 'ingalls',
            access: 'user',
            email: 'ingalls@example.com',
            flags: {}
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('PATCH /api/user/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/user/1',
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${flight.token.admin}`
            },
            body: {
                access: 'admin',
                flags: {
                    gpu: true
                }
            }
        }, t);

        t.ok(res.body.created);
        delete (res.body.created);
        t.ok(res.body.updated);
        delete (res.body.updated);

        t.deepEquals(res.body, {
            id: 1,
            username: 'ingalls',
            access: 'admin',
            email: 'ingalls@example.com',
            flags: {
                gpu: true
            }
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

test('GET /api/user/1', async (t) => {
    try {
        const res = await flight.request({
            json: true,
            url: '/api/user/1',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${flight.token.admin}`
            }
        }, t);

        t.ok(res.body.created);
        delete (res.body.created);
        t.ok(res.body.updated);
        delete (res.body.updated);

        t.deepEquals(res.body, {
            id: 1,
            username: 'ingalls',
            access: 'admin',
            email: 'ingalls@example.com',
            flags: {
                gpu: true
            }
        });
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
