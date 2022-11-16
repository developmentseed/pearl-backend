import fs from 'fs';
import path from 'path';
import test from 'tape';
import Flight from './flight';

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

const UPDATE = process.env.UPDATE;

test('GET: api/schema', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema',
            method: 'GET',
            json: true
        }, t);

        const fixture = path.resolve(__dirname, './fixtures/get_schema.json');

        t.deepEquals(res.body, JSON.parse(fs.readFileSync(fixture)));

        if (UPDATE) {
            fs.writeFileSync(fixture, JSON.stringify(res.body, null, 4));
        }
    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

test('GET: api/schema?method=FAKE', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?method=fake',
            method: 'GET',
            json: true
        }, false);

        t.equals(res.statusCode, 400, 'http: 400');

        t.deepEquals(res.body, {
            status: 400,
            message: 'validation error',
            messages: [{
                keyword: 'enum',
                dataPath: '.method',
                schemaPath: '#/properties/method/enum',
                params: {
                    allowedValues: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH']
                },
                message: 'should be equal to one of the allowed values'
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
            url: '/api/schema?url=123',
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

test('GET: api/schema?method=POST&url=/login', async (t) => {
    try {
        const res = await flight.request({
            url: '/api/schema?method=GET&url=/schema',
            method: 'GET',
            json: true
        }, t);

        t.deepEquals(res.body, {
            query: require('../schema/req.query.ListSchema.json'),
            res: require('../schema/res.ListSchema.json'),
            body: null
        });

    } catch (err) {
        t.error(err, 'no error');
    }

    t.end();
});

flight.landing(test);
