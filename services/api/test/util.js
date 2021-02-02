'use strict';

const api = require('../index');
const { Client } = require('pg');
const request = require('request');
const session = request.jar();
const Config = require('../lib/config');

class Flight {

    constructor() {
        this.srv = false;
        this.pool = false;
    }

    /**
     * Bootstrap a new server test instance
     *
     * @param {Tape} test tape instance to run takeoff action on
     */
    takeoff(test) {
        this.rebuild(test);

        test('test server takeoff', (t) => {
            api.configure({}, (srv, pool) => {
                t.ok(srv, 'server object returned');
                t.ok(pool, 'pool object returned');

                this.srv = srv;
                this.pool = pool;

                t.end();
            });
        });
    }

    /**
     * Wipe the database
     *
     * @param {Tape} test tape instance to run wipe action on
     */
    rebuild(test) {
        test('test database wipe', async (t) => {
            if (this.srv) {
                t.fail('Cannot wipe database while server is running');
                return t.end();
            }

            const config = await Config.env();

            const client = new Client({
                connectionString: config.Postgres
            });

            try {
                await client.connect();

                await client.query(`
                    DROP DATABASE IF EXISTS lulc;
                `);

                await client.query(`
                    CREATE DATABASE lulc;
                `);

                await client.end();
            } catch (err) {
                t.error(err);
            }
        });
    }

    /**
     * Create a new user & return an access token
     *
     * @param {Tape} test tape instance to run new user creation on
     */
    user(test) {
        return new Promise((resolve, reject) => {
            test('api online', (t) => {
                request({
                    method: 'GET',
                    json: true,
                    url: 'http://localhost:2000/api'
                } , (err, res, body) => {
                    t.error(err, 'no error');

                    t.equals(res.statusCode, 200);

                    t.deepEquals(body, {
                        version: '1.0.0'
                    });

                    t.end();
                });
            });

            test('new user', (t) => {
                request({
                    method: 'POST',
                    json: true,
                    url: 'http://localhost:2000/api/user',
                    body: {
                        username: 'example',
                        email: 'example@example.com',
                        password: 'password123'
                    }
                } , (err, res, body) => {
                    t.error(err, 'no error');

                    t.equals(res.statusCode, 200, '200 status code');

                    t.deepEquals(body, {
                        status: 200,
                        message: 'User Created'
                    }, 'expected body');

                    t.end();
                });
            });

            test('new session', (t) => {
                request({
                    method: 'POST',
                    json: true,
                    url: 'http://localhost:2000/api/login',
                    jar: session,
                    body: {
                        username: 'example',
                        password: 'password123'
                    }
                } , (err, res, body) => {
                    t.error(err, 'no error');

                    t.equals(res.statusCode, 200, '200 status code');

                    t.deepEquals(body, {
                        username: 'example'
                    }, 'expected body');

                    t.equals(res.headers['set-cookie'].length, 1, '1 cookie is set');
                    t.equals(res.headers['set-cookie'][0].split('=')[0], 'session', 'session cookie is set');

                    t.end();
                });
            });

            test('new token', (t) => {
                request({
                    method: 'POST',
                    json: true,
                    jar: session,
                    url: 'http://localhost:2000/api/token',
                    body: {
                        name: 'Access Token'
                    }
                } , (err, res, body) => {
                    t.error(err, 'no error');

                    t.equals(res.statusCode, 200, '200 status code');

                    t.deepEquals(Object.keys(body), [
                        'id',
                        'name',
                        'token',
                        'created'
                    ], 'expected props');

                    delete body.created;

                    const token = body.token;
                    delete body.token;

                    t.deepEquals(body, {
                        id: 1,
                        name: 'Access Token'
                    }, 'expected body');

                    resolve(token);

                    t.end();
                });
            });
        });
    }

    /**
     * Shutdown an existing server test instance
     *
     * @param {Tape} test tape instance to run landing action on
     */
    landing(test) {
        test('test server landing - api', async (t) => {
            t.ok(this.srv, 'server object returned');
            t.ok(this.pool, 'pool object returned');

            await this.pool.end();
            await this.srv.close();

            t.end();
        });
    }
}

module.exports = {
    Flight
};
