#!/usr/bin/env node



const util = require('./lib/util');
const run = require('./lib/run');

/**
 * @class LULC
 */
class LULC {

    /**
     * @param {Object} api Global API Settings Object
     * @param {string} api.url URL of OA API instance to interact with
     * @param {string} api.username Username
     * @param {string} api.password Password
     * @param {string} api.token API Token
     */
    constructor(api = {}) {
        this.url = api.url ? new URL(api.url).toString() : 'http://localhost:2000';

        this.user = {
            username: api.username ? api.username : process.env.LULC_USERNAME,
            password: api.password ? api.password : process.env.LULC_PASSWORD,
            token: api.token ? api.token : process.env.LULC_TOKEN
        };

        this.schema = util.local_schema();
    }

    /**
     * Run an LULC Command
     *
     * @param {String} cmd - Command to run
     * @param {String} subcmd - Subcommand to run
     *
     * @param {Object} payload - Optional API Payload
     */
    async cmd(cmd, subcmd, payload, stream = false) {
        if (process.env.UPDATE) this.schema = await util.schema(this.url);

        if (!this.schema.cli[cmd]) throw new Error('Command Not Found');
        if (!this.schema.cli[cmd][subcmd]) throw new Error('Subcommand Not Found');
        if (!this.schema.schema[this.schema.cli[cmd][subcmd]]) throw new Error('API not found for Subcommand');

        let url = this.schema.cli[cmd][subcmd];
        const matches = url.match(/:[a-z]+/g);

        if (matches) {
            for (const match of matches) {
                if (!payload[match]) throw new Error(`"${match}" is required in body`);
                url = url.replace(match, payload[match]);
                delete payload[match];
            }
        }

        const schema = this.schema.schema[this.schema.cli[cmd][subcmd]];

        return await run(this, schema, url, payload, stream);
    }
}

module.exports = LULC;
