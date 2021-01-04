'use strict';

const pkg = require('../package.json');

class Config {
    static async env(args) {
        this.Postgres = process.env.Postgres || args.postgres || 'postgres://postgres@localhost:5432/lulc';

        if (args.prod && !process.env.CookieSecret) {
            throw new Error('CookieSecret env var must be used in production environment');
        }

        this.CookieSecret = process.env.CookieSecret || 'dev-secret';

        return this;
    }
}

module.exports = Config;
