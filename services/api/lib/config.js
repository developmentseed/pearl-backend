'use strict';

class Config {
    static env(args = {}) {
        if (args.prod && !process.env.SigningSecret) {
            throw new Error('SigningSecret env var must be set in production environment');
        }

        this.AzureStorage = process.env.AZURE_STORAGE_CONNECTION_STRING || false;
        if (this.AzureStorage) console.log('ok - AzureStorage: Enabled');

        this.Environment = args.prod ? 'deploy' : 'local';
        console.log(`ok - Environment: ${this.Environment}`);

        this.Postgres = process.env.Postgres || args.postgres || 'postgres://postgres@localhost:5432/lulc';

        this.TileUrl = process.env.TileUrl || args.tileurl || false;

        this.SigningSecret = process.env.SigningSecret || 'dev-secret';

        this.Port = args.port || 2000;

        this.Auth0IssuerBaseUrl = process.env.AUTH0_ISSUER_BASE_URL || 'https://dev-y5qeoqlh.us.auth0.com';

        this.BaseUrl = `http://localhost:${this.Port}`;

        return this;
    }
}

module.exports = Config;
