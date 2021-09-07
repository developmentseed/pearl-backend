const CP = require('child_process');

/**
 * @class
 * Spin up a CPU based GPU worker for tests
 * Assumes that the gpu has been build and tagged as `gpu` in docker
 */
class Worker {
    /**
     * @constructor
     * @param {Object} test Tape Runner
     * @param {Object} opts Options Object
     * @param {Number} [opts.instance=1] Instance ID to register worker as
     * @param {String} [opts.socket='ws://socket:1999'] Socket to connect to
     * @param {String} [opts.api='http://api:2000'] API to connect to
     * @param {String} [opts.tiler='http://tiler:8000'] TiTiler to connect to
     */
    constructor(test, opts = {}) {
        if (!opts.instance) opts.instance = 1;
        if (!opts.socket) opts.socket = 'ws://socket:1999';
        if (!opts.api) opts.api = 'http://api:2000';
        if (!opts.tiler) opts.tiler = 'http://tiler:8000';

        this.test = test;
        this.opts = opts;
        this.worker = false;
    }

    /**
     * Start a GPU worker in the background
     */
    start() {
        this.test('Starting Worker', (t) => {

            this.worker = CP.spawn('docker', [
                'run',
                '--network', 'lulc-infra_default',
                '--env', `INSTANCE_ID=${this.opts.instance}`,
                '--env', `API=${this.opts.api}`,
                '--env', `SOCKET=${this.opts.socket}`,
                '--env', `TileUrl=${this.opts.tiler}`,
                'gpu',
            ], {
                detached: true
            });

            this.worker.stdout.pipe(process.stdout);
            this.worker.stderr.pipe(process.stderr);

            this.worker.on('error', (err) => {
                console.error(err);
            });

            t.end();
        });
    }

    stop() {
        this.test('Stopping Worker', (t) => {
            if (!this.worker.kill()) throw new Error('Failed to kill worker');
            t.ok('Killed Worker');
            t.end();
        });
    }
}

module.exports = Worker;
