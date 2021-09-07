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
            this.fixtures.push(d);
        }

        this.fixtures.reverse();
    }

    compare(returned) {
        if (!this.fixtures.length) throw new Error('No more fixtures to pop()');

        let expected = this.fixtures.pop();

        this.t.deepEquals(expected, returned);
    }
}

module.exports = Output;
