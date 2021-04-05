'use strict';

const { Validator } = require('express-json-validator-middleware');
const $RefParser = require('json-schema-ref-parser');
const path = require('path');

class Schemas {
    constructor() {
        this.validator = new Validator({
            allErrors: true
        });

        this.schemas = new Map();
        this.validate = this.validator.validate;
    }

    async get(url, schemas = {}) {
        const parsed = url.split(' ');
        if (parsed.length !== 2) throw new Error('schema.get() must be of format "<VERB> <URL>"');

        for (const type of ['body', 'query', 'res']) {
            if (!schemas[type]) continue;
            schemas[type] = await $RefParser.dereference(path.resolve(__dirname, '../schema/', schemas[type]));
        }

        this.schemas.set(parsed.join(' '), schemas);

        if (!schemas.body && !schemas.query) {
            return [parsed[1]];
        }

        const opts = {};
        if (schemas.query) opts.query = schemas.query;
        if (schemas.body) opts.body = schemas.body;

        const flow = [parsed[1], []];

        if (schemas.query) flow[1].push(Schemas.query(schemas.query));

        flow[1].push(this.validate(opts));

        return flow;
    }

    /**
     * Express middleware to identify query params that should be integers/booleans according to the schema
     * and attempt to cast them as such to ensure they pass the schema
     *
     * @param {Object} schema JSON Schema
     *
     * @returns {Function}
     */
    static query(schema) {
        return function (req, res, next) {
            for (const key of Object.keys(req.query)) {
                if (schema.properties[key] && schema.properties[key].type === 'integer') {
                    req.query[key] = parseInt(req.query[key]);
                } else if (schema.properties[key] && schema.properties[key].type === 'boolean') {
                    if (['true', '1'].includes(req.query[key])) {
                        req.query[key] = true;
                    } else if (['false', '0', null, undefined].includes(req.query[key])) {
                        req.query[key] = false;
                    }
                }
            }

            return next();
        };
    }

    /**
     * Return all schemas (body, query, etc) for a given method + url
     *
     * @param {String} method HTTP Method
     * @param {String} url URL
     *
     * @returns {Object}
     */
    query(method, url) {
        if (!this.schemas.has(`${method} ${url}`)) {
            return { body: null, schema: null };
        }

        const schema = JSON.parse(JSON.stringify(this.schemas.get(`${method} ${url}`)));
        if (!schema.query) schema.query = null;
        if (!schema.body) schema.body = null;
        if (!schema.res) schema.res = null;

        return schema;
    }

    /**
     * Return a list of endpoints with schemas
     *
     * @returns {Object}
     */
    list() {
        const lite = {};

        for (const key of this.schemas.keys()) {
            lite[key] = {
                body: !!this.schemas.get(key).body,
                query: !!this.schemas.get(key).query,
                res: !!this.schemas.get(key).res
            };
        }

        return lite;
    }
}

module.exports = Schemas;
