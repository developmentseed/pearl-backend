'use strict';

class Config {
    static async env(args) {
        if (args.prod && !process.env.CookieSecret) {
            throw new Error('CookieSecret env var must be set in production environment');
        } else if (args.prod && !process.env.TokenSecret) {
            throw new Error('TokenSecret env var must be set in production environment');
        } else if (args.prod && !process.env.InstanceSecret) {
            throw new Error('InstanceSecret env var must be set in production environment');
        }

        this.Postgres = process.env.Postgres || args.postgres || 'postgres://postgres@localhost:5432/lulc';

        this.CookieSecret = process.env.CookieSecret || 'dev-cookie-secret';
        this.TokenSecret = process.env.TokenSecret || 'dev-token-secret';
        this.InstanceSecret = process.env.InstanceSecret || 'dev-instance-secret';

        this.Port = args.port || 2000;

        return this;
    }
}

module.exports = Config;
