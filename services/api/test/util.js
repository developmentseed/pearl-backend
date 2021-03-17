'use strict';

const api = require('../index');
const request = require('request');
const pkg = require('../package.json');
const { Config } = require('../index');
const drop = require('./drop');

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
                t.end();
            }

            try {
                const config = await drop();
                config.pool.end();
            } catch (err) {
                t.error(err);
            }

            t.end();
        });
    }

    /**
     * Create a new user & return an access token
     *
     * @param {Tape} t active tape instance to run new user creation on
     * @param {Object} opts Options object
     * @param {String} [opts.access=user] Should the user be user or admin
     */
    user(t, opts = {}) {
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
                        version: pkg.version,
                        limits: {
                            live_inference: 1e+7,
                            max_inference: 1e+7,
                            instance_window: 600
                        }
                    });

                    t.end();
                });
            });

            t.test('new user', async (t) => {
                const config = await Config.env();

                const auth = new (require('../lib/auth').Auth)(config);
                const authtoken = new (require('../lib/auth').AuthToken)(config);

                const testUser = {
                    access: opts.access || 'user',
                    auth0Id: 1,
                    username: 'example',
                    email: 'example@example.com'
                };

                const user = await auth.create(testUser);
                const token = await authtoken.generate({ type: 'auth0', ...user }, 'API Token');

                t.deepEquals(Object.keys(token), [ 'id', 'name', 'token', 'created' ], 'expected props');

                config.pool.end(() => {
                    resolve(token);
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
