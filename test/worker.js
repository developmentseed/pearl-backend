'use strict';
const CP = require('child_process');

/**
 * Spin up a CPU based GPU worker for tests
 * Assumes that the gpu has been build and tagged as `gpu` in docker
 *
 * @class
 * @param {Object} test Tape Runner
 * @param {Object} opts Options Object
 * @param {Number} [opts.instance=1] Instance ID to register worker as
 * @param {String} [opts.socket='ws://socket:1999'] Socket to connect to
 * @param {String} [opts.api='http://api:2000'] API to connect to
 * @param {String} [opts.tiler='http://tiler:8000'] TiTiler to connect to
 * @param {String} [opts.pctiler='https://planetarycomputer.microsoft.com'] PlanetaryComputer tiler to connect to
 */
class Worker {
    constructor(test, opts = {}) {
        if (!opts.instance) opts.instance = 1;
        if (!opts.socket) opts.socket = 'ws://socket:1999';
        if (!opts.api) opts.api = 'http://api:2000';
        if (!opts.tiler) opts.tiler = 'http://tiler:8000';
        if (!opts.pctiler) opts.pctiler = 'https://planetarycomputer.microsoft.com';

        this.test = test;
        this.opts = opts;
        this.worker = false;
        this.exited = false;
    }

    /**
     * Start a GPU worker in the background
     */
    start() {
        this.test('Starting Worker', (t) => {

            this.worker = CP.spawn('docker', [
                'run',
                '--network', 'pearl-backend_default',
                '--env', `INSTANCE_ID=${this.opts.instance}`,
                '--env', `API=${this.opts.api}`,
                '--env', `SOCKET=${this.opts.socket}`,
                '--env', `TileUrl=${this.opts.tiler}`,
                '--env', `PcTileUrl=${this.opts.pctiler}`,
                'gpu'
            ]);

            this.worker.stdout.pipe(process.stdout);
            this.worker.stderr.pipe(process.stderr);

            this.worker.on('error', (err) => {
                console.error(err);
            });

            this.worker.on('exit', () => {
                this.exited = true;
            });

            t.end();
        });
    }

    stop() {
        this.test('Stopping Worker', (t) => {
            if (!this.exited) {
                if (!this.worker.kill()) throw new Error('Failed to kill worker');
                t.ok('Killed Worker');
            } else {
                this.exited = true;
            }

            t.end();
        });
    }

    /**
     * Ensure all workers are terminated, including workers from prior unrelated runs
     *
     * This is important as otherwise existing workers can connect to your test server
     * and influence their results incidentally
     */
    static dalek() {
        String(CP.execSync('docker ps --filter ancestor=gpu'))
            .split('\n')
            .slice(1)
            .filter((e) => !!e.trim().length)
            .map((e) => e.split(' ')[0])
            .forEach((e) => CP.execSync(`docker kill ${e}`));
    }
}

module.exports = Worker;
