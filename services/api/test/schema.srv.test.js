import fs from 'fs';
import test from 'tape';
import Flight from './flight.js';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

const UPDATE = process.env.UPDATE;

test('GET: api/schema', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema',
            json: true,
            method: 'GET'
        }, t);

        const fixture = new URL('./fixtures/get_schema.json', import.meta.url);

        if (UPDATE) {
            fs.writeFileSync(fixture, JSON.stringify(res.body, null, 4));
        }

        t.deepEqual(res.body, JSON.parse(fs.readFileSync(fixture)));
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/schema?method=FAKE', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?method=fake',
            json: true,
            method: 'GET'
        }, false);

        t.equal(res.statusCode, 400, 'http: 400');

        t.deepEqual(res.body, {
            status: 400,
            message: 'validation error',
            messages: [{
                keyword: 'enum',
                instancePath: '/method',
                schemaPath: '#/properties/method/enum',
                params: {
                    allowedValues: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH']
                },
                message: 'must be equal to one of the allowed values'
            }]
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/schema?method=GET', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?method=GET',
            json: true,
            method: 'GET'
        }, false);

        t.equal(res.statusCode, 400, 'http: 400');
        t.deepEqual(res.body, {
            status: 400,
            message: 'url & method params must be used together',
            messages: []
        });

    } catch (err) {
        t.error(err, 'no error');
    }
});

test('GET: api/schema?url=123', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?url=123',
            json: true,
            method: 'GET'
        }, false);

        t.equal(res.statusCode, 400, 'http: 400');
        t.deepEqual(res.body, {
            status: 400,
            message: 'url & method params must be used together',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

flight.landing(test);
