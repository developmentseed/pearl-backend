'use strict';

class Config {
    static async env(args) {
        if (args.prod && !process.env.InstanceSecret) {
            throw new Error('InstanceSecret env var must be set in production environment');
        }

        this.InstanceSecret = process.env.InstanceSecret || 'dev-instance-secret';

        this.Port = args.port || 1999;

        return this;
    }
}

module.exports = Config;
