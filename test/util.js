'use strict';

const APIFlight = require('../services/api/test/util').Flight;
const socket = require('../services/socket/index');
const { Client } = require('pg');

class Flight {

    constructor() {
        this.api = false;
        this.socket = false;
    }

    /**
     * Bootstrap a new server test instance
     *
     * @param {Tape} test tape instance to run takeoff action on
     */
    takeoff(test) {
        this.api = new APIFlight();
        this.api.takeoff(test);

        test('test socket takeoff', (t) => {
            socket.configure({}, (socket) => {
                t.ok(socket, 'socket object returned');

                this.socket = socket;

                t.end();
            });
        });
    }

    /**
     * Shutdown an existing server test instance
     *
     * @param {Tape} test tape instance to run landing action on
     */
    landing(test) {
        this.api.landing(test);

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
