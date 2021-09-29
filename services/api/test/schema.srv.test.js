const fs = require('fs');
const path = require('path');
const test = require('tape');
const request = require('request');
const Flight = require('./flight');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

const UPDATE = process.env.UPDATE;

test('GET: api/schema', async (t) => {
    try {
        const res = await flight.request({
            url: 'http://localhost:2000/api/schema',
            method: 'GET',
            json: true
        }, t);

        const fixture = path.resolve(__dirname, './fixtures/get_schema.json');
        if (UPDATE) {
            fs.writeFileSync(fixture, JSON.stringify(res.body, null, 4));
        }

        t.deepEquals(res.body, JSON.parse(fs.readFileSync(fixture)));

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/schema?method=FAKE', async (t) => {
    try {
        const res = await flight.request({
            url: 'http://localhost:2000/api/schema?method=fake',
            method: 'GET',
            json: true
        }, false);

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'validation error',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/schema?method=GET', async (t) => {
    try {
        const res = await flight.request({
            url: 'http://localhost:2000/api/schema?method=GET',
            method: 'GET',
            json: true
        }, false);

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'url & method params must be used together',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/schema?url=123', async (t) => {
    try {
        const res = await flight.request({
            url: 'http://localhost:2000/api/schema?url=123',
            method: 'GET',
            json: true
        }, false);

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'url & method params must be used together',
            messages: []
        });
    } catch (err) {
        t.error(err, 'no error');
    }


    t.end();
});

test('GET: api/schema?method=POST&url=/token', async (t) => {
    try {
        const res = await flight.request({
            url: 'http://localhost:2000/api/schema?method=POST&url=/token',
            method: 'GET',
            json: true
        }, t);

        t.deepEquals(res.body, {
            body: {
                type: 'object',
                required: ['name'],
                additionalProperties: false,
                properties: {
                    name: { type: 'string', description: 'name of the created token' }
                }
            },
            query: null,
            res: null
        });

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});


flight.landing(test);
