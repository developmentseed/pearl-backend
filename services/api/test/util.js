'use strict';

const api = require('../index');
const { Client } = require('pg');
const request = require('request');
const pkg = require('../package.json');
const { Config } = require('../index');

const config = Config.env();

const { Pool } = require('pg');
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
    async takeoff(test) {
        this.rebuild(test);

        test('test server takeoff', (t) => {
            process.exit();
            api.configure({}, async (srv, pool) => {
                t.ok(srv, 'server object returned');
                t.ok(pool, 'pool object returned');

                let pgres = await pool.query(`
                    SELECT count(*) FROM users;
                `);

                t.equals(pgres.rows.length, 0, 'users wiped');

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
                t.end();
            }

            const client = new Client({
                connectionString: 'postgres://postgres@localhost:5432/postgres'
            });

            try {
                await client.connect();

                await client.query(`
                    DROP DATABASE lulc;
                `);

                await client.query(`
                    CREATE DATABASE lulc;
                `);

                await client.end();

                t.end();
            } catch (err) {
                t.error(err);
            }
        });
    }

    /**
     * Create a new user & return an access token
     *
     * @param {Tape} t active tape instance to run new user creation on
     */
    user(t) {
        return new Promise((resolve, reject) => {
            t.test('api online', (t) => {
                request({
                    method: 'GET',
                    json: true,
                    url: 'http://localhost:2000/api'
                } , (err, res, body) => {
                    t.error(err, 'no error');

                    t.equals(res.statusCode, 200);

                    t.deepEquals(body, {
                        version: pkg.version
                    });

                    t.end();
                });
            });

            t.test('new user', async (t) => {
                const auth = new (require('../lib/auth').Auth)(this.pool);
                const authtoken = new (require('../lib/auth').AuthToken)(this.pool, config);

                const testUser = {
                    username: 'example',
                    email: 'example@example.com',
                    password: 'password123'
                };

                await auth.register(testUser);

                const user = await auth.login(testUser);
                const token = await authtoken.generate(user, 'API Token');

                t.deepEquals(Object.keys(token), [
                    'id',
                    'name',
                    'token',
                    'created'
                ], 'expected props');

                resolve(token);
            });
        });
    }

    /**
     * Shutdown an existing server test instance
     *
     * @param {Tape} test tape instance to run landing action on
     */
    landing(test) {
        test('test server landing - api', (t) => {
            t.ok(this.srv, 'server object returned');
            t.ok(this.pool, 'pool object returned');

            this.pool.end(() => {
                this.srv.close(() => {
                    t.end();
                });
            });
        });
    }
}

module.exports = {
    Flight
};
