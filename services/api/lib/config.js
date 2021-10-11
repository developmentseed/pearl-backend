const { sql, createPool, createTypeParserPreset } = require('slonik');
const wkx = require('wkx');

/**
 * @class
 */
class Config {
    static async env(args = {}) {
        if (args.prod && !process.env.SigningSecret) {
            throw new Error('SigningSecret env var must be set in production environment');
        }

        this.SigningSecret = process.env.SigningSecret || 'dev-secret';

        this.silent = !!args.silent;
        this.test = !!args.test;

        if (this.test) {
            this.AzurePrefix = Math.random().toString(36).substring(2, 15) + '-';
        } else {
            this.AzurePrefix = '';
        }

        this.AzureStorage = process.env.AZURE_STORAGE_CONNECTION_STRING || false;
        if (this.AzureStorage) console.log('ok - AzureStorage: Enabled');

        this.Environment = args.prod ? 'deploy' : 'local';
        console.log(`ok - Environment: ${this.Environment}`);

        this.Postgres = process.env.Postgres || 'postgres://postgres@localhost:5432/lulc';

        this.TileUrl = process.env.TileUrl || args.tileurl || false;

        this.Port = args.port || 2000;

        this.Auth0IssuerBaseUrl = process.env.AUTH0_ISSUER_BASE_URL || 'https://pearl-landcover.us.auth0.com';

        this.BaseUrl = `http://localhost:${this.Port}`;

        this.GpuImageName = process.env.GpuImageName || '';
        this.GpuImageTag = process.env.GpuImageTag || '';
        this.Deployment = process.env.Deployment || 'lulc-test-lulc-helm';
        this.nodeSelectorKey = process.env.nodeSelectorKey || 'agentpool';
        this.nodeSelectorValue = process.env.nodeSelectorValue || 'gpunodepool';
        this.GpuCount = process.env.GpuCount ? Number(process.env.GpuCount) : 2;

        this.ApiUrl = process.env.ApiUrl || '';
        this.SocketUrl = process.env.SocketUrl || '';

        this.pool = false;
        let retry = 5;
        do {
            try {
                this.pool = createPool(this.Postgres, {
                    typeParsers: [
                        ...createTypeParserPreset(), {
                            name: 'geometry',
                            parse: (value) => {
                                return wkx.Geometry.parse(Buffer.from(value, 'hex')).toGeoJSON();
                            }
                        }
                    ]
                });

                await this.pool.query(sql`SELECT NOW()`);
            } catch (err) {
                this.pool = false;

                if (retry === 0) {
                    console.error('not ok - terminating due to lack of postgres connection');
                    return process.exit(1);
                }

                retry--;
                console.error('not ok - unable to get postgres connection');
                console.error(`ok - retrying... (${5 - retry}/5)`);
                await sleep(5000);
            }
        } while (!this.pool);

        return this;
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

module.exports = Config;
