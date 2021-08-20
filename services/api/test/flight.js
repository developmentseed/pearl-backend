'use strict';

process.env.StackName = 'test';

const { sql } = require('slonik');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const prequest = promisify(require('request'));
const api = require('../index');
const Knex = require('knex');
const KnexConfig = require('../knexfile');
const drop = require('./drop');
const { pathToRegexp } = require('path-to-regexp');
const Ajv = require('ajv');
const ajv = new Ajv({
    allErrors: true
});

class Flight {

    constructor() {
        this.srv;
        this.base = false;
        this.token = {};
    }

    /**
     * Clear and restore an empty database schema
     *
     * @param {Tape} test Tape test instance
     */
    init(test) {
        test('start: database', async (t) => {
            try {
                await drop();
                KnexConfig.connection = process.env.Postgres || 'postgres://postgres@localhost:5432/lulc';
                const knex = Knex(KnexConfig);
                await knex.migrate.latest();
                await knex.destroy();
            } catch (err) {
                t.error(err);
            }

            this.schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, './fixtures/get_schema.json')));
            this.routes = {};

            for (const route of Object.keys(this.schema)) {
                this.routes[route] = new RegExp(pathToRegexp(route.split(' ').join(' /api')));
            }

            t.end();
        });
    }

    /**
     * Request data from the API & Ensure the output schema matches the response
     *
     * @param {Object} req Request Object
     * @param {Object} t Options test argument - if not present doesn't test API response
     */
    async request(req, t) {
        req.url = new URL(req.url, this.base);

        if (!t) return await prequest(req);

        let match = false;
        const spath = `${req.method.toUpperCase()} ${req.url.pathname}/`;

        for (const r of Object.keys(this.routes)) {
            if (spath.match(this.routes[r])) {
                match = r;
            }
        }

        if (!match) {
            t.fail(`Cannot find schema match for: ${spath}`);
            return;
        }

        const schemaurl = new URL('/api/schema', this.base);
        schemaurl.searchParams.append('method', match.split(' ')[0]);
        schemaurl.searchParams.append('url', match.split(' ')[1]);

        const schema = ajv.compile((await prequest({
            json: true,
            url: schemaurl
        })).body.res);

        const res = await prequest(req);

        t.equals(res.statusCode, 200, 'statusCode: 200');

        if (res.statusCode === 200) {

            schema(res.body);

            if (!schema.errors) return res;

            for (const error of schema.errors) {
                t.fail(`${error.schemaPath}: ${error.message}`);
            }
        } else {
            // Just print the body instead of spewing
            // 100 schema validation errors for an error response
            t.fail(JSON.stringify(res.body));
        }

        return res;
    }

    /**
     * Bootstrap a new server test instance
     *
     * @param {Tape} test tape instance to run takeoff action on
     * @param {Object} custom custom config options
     */
    takeoff(test, custom = {}) {
        test('test server takeoff', (t) => {
            api(Object.assign({
                silent: true,
                test: true
            }, custom), (srv, config) => {
                t.ok(srv, 'server object returned');
                t.ok(config, 'config object returned');

                this.srv = srv;

                this.base = `http://localhost:${config.Port}`;

                this.config = config;

                t.end();
            });
        });
    }

    /**
     * Create a new user and return an API token for that user
     *
     * @param {Object} test Tape runner
     * @param {String} username Username for user to create
     */
    user(test, username, admin = false) {
        test.test('Create Token', async (t) => {
            try {
                const new_user = await prequest({
                    url: new URL(`/api/user`, this.base),
                    json: true,
                    method: 'POST',
                    body: {
                        username: username,
                        email: `${username}@example.com`
                    }
                });

                if (new_user.statusCode !== 200) throw new Error(new_user.body.message);

                if (admin) {
                    await this.config.pool.query(sql`
                         UPDATE users
                            SET
                                access = 'admin'
                            WHERE
                                id = ${new_user.body.uid}
                    `);
                }

                this.token[username] = new_user.body.token;

            } catch (err) {
                t.error(err);
            }

            t.end();
        });
    }

    /**
     * Shutdown an existing server test instance
     *
     * @param {Tape} test tape instance to run landing action on
     */
    landing(test) {
        test('test server landing - api', async (t) => {
            if (this.srv) {
                t.ok(this.srv, 'server object returned');
                await this.srv.close();
            }

            t.ok(this.config.pool, 'pool object returned');
            await this.config.pool.end();

            t.end();
        });
    }
}

module.exports = Flight;
