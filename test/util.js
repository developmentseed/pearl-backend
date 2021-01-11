'use strict';

const api = require('../services/api/index');
const socket = require('../services/socket/index');
const { Client } = require('pg');

class Flight {

    constructor() {
        this.srv = false;
        this.pool = false;
        this.socket = false;
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

        test('test socket takeoff', (t) => {
            socket.configure({}, (socket) => {
                t.ok(socket, 'socket object returned');

                this.socket = socket;

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
            } catch (err) {
                t.error(err);
            }
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

        test('test server landing - socket', (t) => {
            t.ok(this.socket, 'socket object returned');

            this.socket(() => {
                t.end();
            });
        });
    }
}

module.exports = {
    Flight
};
