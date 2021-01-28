'use strict';

class Config {
    static async env(args) {
        if (args.prod && !process.env.SigningSecret) {
            throw new Error('SigningSecret env var must be set in production environment');
        }

        this.AzureStorage = process.env.AZURE_STORAGE_CONNECTION_STRING || false;

        this.Environment = args.prod ? 'deploy' : 'local';

        this.Postgres = process.env.Postgres || args.postgres || 'postgres://postgres@localhost:5432/lulc';
        this.TileUrl = process.env.TileUrl || args.tileurl || false;

        this.SigningSecret = process.env.SigningSecret || 'dev-signing-secret';

        this.Port = args.port || 2000;

        if (!process.env.AUTH0_ISSUER_BASE_URL || !process.env.AUTH0_CLIENT_ID) {
            throw new Error('AUTH0_ISSUER_BASE_URL and AUTH0_CLIENT_ID must be set.');
        }
        this.Auth0IssuerBaseUrl = process.env.AUTH0_ISSUER_BASE_URL;
        this.Auth0ClientId = process.env.AUTH0_CLIENT_ID;
        this.Auth0Audience = process.env.AUTH0_AUDIENCE;

        this.BaseUrl = `http://localhost:${this.Port}`;

        return this;
    }
}

module.exports = Config;
