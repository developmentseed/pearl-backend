const fs = require('fs');
const path = require('path');

/**
 * @class
 */
class Output {
    /**
     * @constructor
     * @param {Object} t Instantiated tape test runner
     * @param {String} input Path to output schema
     */
    constructor(t, input) {
        this.t = t;
        this.schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, input)));

        this.fixtures = [];

        for (const d of this.schema.data) {
            if (!d.items) d.items = 1;

            if (d.data['$ref']) d.data = JSON.parse(fs.readFileSync(path.resolve(__dirname, d.data['$ref'])));

            for (const i = 0; i < d.items; i++) {
                this.fixtures.push(d);
            }
        }

        this.fixtures.reverse();
    }

    compare(returned) {
        if (!this.fixtures.length) throw new Error('No more fixtures to pop()');

        let expected = this.fixtures.pop();

        if (expected.type === 'static') {
            this.t.deepEquals(expected, returned);
        } else if (expected.type === 'schema') {
            console.error('AJV compare');
        } else {
            throw new Error('Unsupported Output Type');
        }

    }
}

module.exports = Output;
