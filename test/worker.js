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
     */
    constructor(test, opts = {}) {
        if (!opts.instance) opts.instance = 1;

        this.test = test;
        this.opts = opts;
        this.worker = false;
    }

    /**
     * Start a GPU worker in the background
     */
    async start() {
        this.test('Starting Worker', (t) => {
            this.worker = CP.spawn('docker', ['run', 'gpu'], {
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

    async stop() {
        this.test('Stopping Worker', (t) => {
            if (!this.worker.kill()) throw new Error('Failed to kill worker');

            t.end();
        });
    }
}

module.exports = Worker;
