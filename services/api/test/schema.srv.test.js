const fs = require('fs');
const path = require('path');
const test = require('tape');
const request = require('request');
const Flight = require('./flight');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

const UPDATE = process.env.UPDATE;

test('GET: api/schema', (t) => {
    request({
        url: 'http://localhost:2000/api/schema',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');

        const fixture = path.resolve(__dirname, './fixtures/get_schema.json');
        if (UPDATE) {
            fs.writeFileSync(fixture, JSON.stringify(res.body, null, 4));
        }

        t.deepEquals(res.body, JSON.parse(fs.readFileSync(fixture)));

        t.end();
    });
});

test('GET: api/schema?method=FAKE', (t) => {
    request({
        url: 'http://localhost:2000/api/schema?method=fake',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'validation error',
            messages: []
        });

        t.end();
    });
});

test('GET: api/schema?method=GET', (t) => {
    request({
        url: 'http://localhost:2000/api/schema?method=GET',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'url & method params must be used together',
            messages: []
        });

        t.end();
    });
});

test('GET: api/schema?url=123', (t) => {
    request({
        url: 'http://localhost:2000/api/schema?url=123',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 400, 'http: 400');
        t.deepEquals(res.body, {
            status: 400,
            message: 'url & method params must be used together',
            messages: []
        });

        t.end();
    });
});

test('GET: api/schema?method=POST&url=/token', (t) => {
    request({
        url: 'http://localhost:2000/api/schema?method=POST&url=/token',
        method: 'GET',
        json: true
    }, (err, res) => {
        t.error(err, 'no error');

        t.equals(res.statusCode, 200, 'http: 200');
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

        t.end();
    });
});


flight.landing(test);
