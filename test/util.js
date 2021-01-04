const api = require('../api/index');

class Flight {

    constructor() {
        this.srv = false;
        this.pool = false;
    }

    /**
     * Bootstrap a new server test instance
     *
     * @param {Tape} test tape instance to run takeoff test on
     */
    takeoff(test) {
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
     * Shutdown an existing server test instance
     *
     * @param {Tape} test tape instance to run landing on
     */
    landing(test) {
        test('test server landing', (t) => {
            t.ok(this.srv, 'server object returned');
            t.ok(this.pool, 'pool object returned');
            
            this.pool.end();
            this.srv.close();

            t.end();
        });
    }
}

module.exports = {
    Flight
}
