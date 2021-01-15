'use strict';

class Config {
    static async env(args) {
        if (args.prod && !process.env.SigningSecret) {
            throw new Error('SigningSecret env var must be set in production environment');
        }

        this.Postgres = process.env.Postgres || args.postgres || 'postgres://postgres@localhost:5432/lulc';
        this.TileUrl = process.env.TileUrl || args.tileurl || false;

        this.SigningSecret = process.env.SigningSecret || 'dev-secret';

        this.Port = args.port || 2000;

        return this;
    }
}

module.exports = Config;
