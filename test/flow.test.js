'use strict';

//
// Test the following authentication flow between services
// - Create new user
// - Create new token
// - Authenticate with WS router
//

const request = require('request');

const API = process.env.API || 'http://localhost:2000';
const SOCKET = process.env.SOCKET || 'http://localhost:1999';

const test = require('tape');

const WebSocket = require('ws');

const argv = require('minimist')(process.argv, {
    boolean: ['prod'],
    string: ['postgres', 'port']
});
const { Client, Pool } = require('pg');
const Config = require('../services/api/lib/config');

main();

async function main() {

    // Setup auth client to create user programmatically
    const config = await Config.env(argv);
    const client = new Client({
        connectionString: config.Postgres
    });
    const pool = new Pool({
        connectionString: config.Postgres
    });

    let flight;
    if (process.env.TEST !== 'compose') {
        const { Flight } = require('./util');
        flight = new Flight();
        flight.takeoff(test);
    } else {
        // Serve should be running already, clean tables
        await client.connect();
        await client.query(`
            TRUNCATE TABLE users;
            TRUNCATE TABLE users_reset;
            TRUNCATE TABLE models;
            TRUNCATE TABLE instances;
            TRUNCATE TABLE checkpoints;
        `);
        await client.end();

    }

    // Create a user in the database, generate a token to be
    // used in the API
    const auth = new (require('../services/api/lib/auth').Auth)(pool);
    const authtoken = new (require('../services/api/lib/auth').AuthToken)(pool, config);
    const testUser = {
        username: 'example',
        email: 'example@example.com',
        password: 'password123'
    };
    const user = await auth.create(testUser);
    const { token } = await authtoken.generate({ type: 'auth0', user }, 'API Token');

    let instance;

    test('api running', (t) => {
        request({
            method: 'GET',
            json: true,
            url: API + '/api'
        } , (err, res, body) => {
            t.error(err, 'no error');

            t.equals(res.statusCode, 200);

            t.deepEquals(body, {
                version: '1.0.0'
            });

            t.end();
        });
    });

    test('new model', (t) => {
        request({
            method: 'POST',
            json: true,
            url: API + '/api/model',
            body: {
                name: 'NAIP Supervised',
                active: true,
                model_type: 'keras_example',
                model_finetunelayer: -4,
                model_numparams: 7790949,
                model_inputshape: [240,240,4],
                classes: [
                    { name: 'Water', color: '#0000FF' },
                    { name: 'Tree Canopy', color: '#008000' },
                    { name: 'Field', color: '#80FF80' },
                    { name: 'Built', color: '#806060' }
                ],
                meta: {}
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        } , (err, res, body) => {
            t.error(err, 'no error');

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(body), [
                'id',
                'created'
            ], 'expected props');

            t.ok(parseInt(body.id), 'id: <integer>');

            delete body.created;
            delete body.id;

            t.deepEquals(body, {
            }, 'expected body');

            t.end();
        });
    });

    test('new instance', (t) => {
        request({
            method: 'POST',
            json: true,
            url: API + '/api/instance',
            body: {
                model_id: 1,
                mosaic: 'naip.latest'
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        } , (err, res, body) => {
            t.error(err, 'no error');

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(body), [
                'id',
                'created',
                'model_id',
                'token',
                'mosaic'
            ], 'expected props');

            t.ok(parseInt(body.id), 'id: <integer>');
            delete body.id,
            delete body.created;
            instance = body.token;
            delete body.token;

            t.deepEquals(body, {
                model_id: 1,
                mosaic: 'naip.latest'
            }, 'expected body');

            t.end();
        });
    });

    test('gpu connection', (t) => {
        const ws = new WebSocket(SOCKET + `?token=${instance}`);

        ws.on('open', () => {
            t.ok('connection opened');
            ws.close();
            t.end();
        });
    });

    if (process.env.TEST !== 'compose') {
        flight.landing(test);
    }
}


