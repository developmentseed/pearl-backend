import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

/**
 * @class
 */
export default class Output {
    /**
     * @constructor
     * @param {Object} t Instantiated tape test runner
     * @param {String} input Path to output schema
     */
    constructor(t, input) {
        this.t = t;
        this.schema = JSON.parse(fs.readFileSync(new URL(input, import.meta.url)));

        this.fixtures = [];

        this.log = fs.createWriteStream('/tmp/output.log');

        for (const d of this.schema.data) {
            if (!d.items) d.items = 1;

            if (d.data['$ref']) d.data = JSON.parse(fs.readFileSync((new URL('./outputs/', import.meta.url)).pathname + d.data['$ref']));

            for (let i = 0; i < d.items; i++) {
                this.fixtures.push(d);
            }
        }

        this.fixtures.reverse();
    }

    compare(returned) {
        if (!this.fixtures.length) throw new Error('No more fixtures to pop()');

        const expected = this.fixtures.pop();

        this.log.write(JSON.stringify(returned) + '\n');

        if (expected.type === 'static') {
            this.t.deepEquals(returned, expected.data);
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

    close() {
        this.log.close();
    }
}
