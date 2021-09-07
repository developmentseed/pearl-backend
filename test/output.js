const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const ajv = new Ajv({
    allErrors: true
});

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

            if (d.data['$ref']) d.data = JSON.parse(fs.readFileSync(path.resolve(__dirname, './outputs', d.data['$ref'])));

            for (let i = 0; i < d.items; i++) {
                this.fixtures.push(d);
            }
        }

        this.fixtures.reverse();
    }

    compare(returned) {
        if (!this.fixtures.length) throw new Error('No more fixtures to pop()');

        const expected = this.fixtures.pop();

        if (expected.type === 'static') {
            this.t.deepEquals(expected.data, returned);
        } else if (expected.type === 'schema') {
            const schema = ajv.compile(expected.data);
            schema(returned);

            if (!schema.errors) return this.t.ok('JSON Schema Matches');

            for (const error of schema.errors) {
                console.error(error);
                this.t.fail(`${error.schemaPath}: ${error.message}`);
            }
        } else {
            throw new Error('Unsupported Output Type');
        }
    }

    /**
     * Has the fixture list been exhausted
     * @returns {boolean}
     */
    done() {
        return !this.fixtures.length;
    }
}

module.exports = Output;
