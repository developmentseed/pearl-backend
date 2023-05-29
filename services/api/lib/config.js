/**
 * @class
 */
export default class Config {
    static env(args = {}) {
        const config = new Config();

        if (args.prod && !process.env.SigningSecret) {
            throw new Error('SigningSecret env var must be set in production environment');
        }

        config.SigningSecret = process.env.SigningSecret || 'dev-secret';

        config.silent = !!args.silent;
        config.test = !!args.test;

        if (config.test) {
            config.AzurePrefix = Math.random().toString(36).substring(2, 15) + '-';
        } else {
            config.AzurePrefix = '';
        }

        config.AzureStorage = process.env.AZURE_STORAGE_CONNECTION_STRING || false;
        if (config.AzureStorage) console.log('ok - AzureStorage: Enabled');

        config.Environment = args.prod ? 'deploy' : 'local';
        console.log(`ok - Environment: ${config.Environment}`);

        config.QA_Tiles = process.env.QA_TILES || 'https://qa-tiles-server-dev.ds.io/services/z17';

        config.Postgres = process.env.Postgres || 'postgres://postgres@localhost:5432/lulc';

        config.TileUrl = process.env.TileUrl || args.tileurl || false;
        config.PcTileUrl = process.env.PcTileUrl || args.pctileurl || false;

        config.Port = args.port || 2000;

        config.Auth0IssuerBaseUrl = process.env.AUTH0_ISSUER_BASE_URL || 'https://pearl-landcover-staging.us.auth0.com';

        config.BaseUrl = `http://localhost:${config.Port}`;

        config.GpuImageName = process.env.GpuImageName || '';
        config.GpuImageTag = process.env.GpuImageTag || '';
        config.Deployment = process.env.Deployment || 'lulc-test-lulc-helm';
        config.GpuCount = process.env.GpuCount ? Number(process.env.GpuCount) : 2;
        config.CpuCount = process.env.CpuCount ? Number(process.env.GpuCount) : 10;

        config.ApiUrl = process.env.ApiUrl || '';
        config.SocketUrl = process.env.SocketUrl || '';

        console.log('LiveInferenceSize', process.env.LiveInferenceSize);
        config.LiveInferenceSize = process.env.LiveInferenceSize ? Number(process.env.LiveInferenceSize) : 100000000;
        config.MaxInferenceSize = process.env.MaxInferenceSize ? Number(process.env.MaxInferenceSize) : 200000000;

        return config;
    }
}
