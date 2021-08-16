'use strict';

const { Validator } = require('express-json-validator-middleware');
const $RefParser = require('json-schema-ref-parser');
const path = require('path');

/**
 * @class
 */
class Schemas {
    /**
     * @constructor
     *
     * @param {Object} router Express Router Object
     */
    constructor(router) {
        if (!router) throw new Error('Router Param Required');

        this.validator = new Validator({
            allErrors: true
        });

        this.router = router;
        this.schemas = new Map();
        this.validate = this.validator.validate;
    }

    check (url, schemas, fns) {
        if (typeof url !== 'string') throw new Error('URL should be string');

        if (schemas === null) schemas = {};
        if (typeof schemas !== 'object') throw new Error('Schemas should be object');

        if (!fns.length) throw new Error('At least 1 route function should be defined');
    }

    async get(url, schemas, ...fns) {
        this.check(url, schemas, fns);
        this.router.get(...await this.generic(`GET ${url}`, schemas), ...fns);
    }

    async delete(url, schemas, ...fns) {
        this.check(url, schemas, fns);
        this.router.delete(...await this.generic(`DELETE ${url}`, schemas), ...fns);
    }

    async post(url, schemas, ...fns) {
        this.check(url, schemas, fns);
        this.router.post(...await this.generic(`POST ${url}`, schemas), ...fns);
    }

    async patch(url, schemas, ...fns) {
        this.check(url, schemas, fns);
        this.router.patch(...await this.generic(`PATCH ${url}`, schemas), ...fns);
    }

    async put(url, schemas, ...fns) {
        this.check(url, schemas, fns);
        this.router.put(...await this.generic(`PUT ${url}`, schemas), ...fns);
    }

    async generic(url, schemas = {}) {
        if (!schemas) schemas = {};

        const parsed = url.split(' ');
        if (parsed.length !== 2) throw new Error('schema.generic() must be of format "<VERB> <URL>"');

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
                } else if (schema.properties[key] && schema.properties[key].type === 'number') {
                    req.query[key] = Number(req.query[key]);
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
