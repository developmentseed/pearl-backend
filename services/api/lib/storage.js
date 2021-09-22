const Err = require('./error');
const moment = require('moment');
const {
    BlobSASPermissions,
    BlobServiceClient
} = require('@azure/storage-blob');

/**
 * @class
 */
class Storage {
    constructor(config, type) {
        this.type = type;
        this.config = config;

        this.client = this.#blob();
    }

    /**
     * Return an Azure Container Client
     */
    #blob() {
        // don't access these services unless AzureStorage is truthy
        if (!this.config.AzureStorage) throw new Err(424, null, 'Azure Storage not configured');

        const blob_client = BlobServiceClient.fromConnectionString(this.config.AzureStorage);
        const container_client = blob_client.getContainerClient(this.type);

        return container_client;
    }

    /**
     * Return a sharing URL that can be used to titiler
     *
     * @param {String} path Partial path fragment to file ie: aoi-1.tiff
     */
    async url(path) {
        const url = new URL(await this.client.generateSasUrl({
            permissions: BlobSASPermissions.parse('r').toString(),
            expiresOn: moment().add(365, 'days')
        }));

        url.pathname = `${this.type}/${this.config.AzurePrefix}${path}`;

        return url;
    }

    /**
     * Upload a file to Azure storage
     *
     * @param {Object} file File Stream to upload
     * @param {String} path Partial path fragment to file ie: aoi-1.tiff
     * @param {String} [mime='image/tiff'] Mime type of file
     */
    async upload(file, path, mime = 'image/tiff') {
        path = this.config.AzurePrefix + path;

        const blob = this.client.getBlockBlobClient(path);

        try {
            await blob.uploadStream(file, 1024 * 1024 * 4, 1024 * 1024 * 20, {
                blobHTTPHeaders: {
                    blobContentType: mime
                }
            });
        } catch (err) {
            throw new Err(500, err, `Failed to upload ${path}`);
        }

        return true;
    }

    /**
     * Check if a file exists on Azure Storage
     *
     * @param {String} path Partial path fragment to file ie: aoi-1.tiff
     */
    async exists(path) {
        path = this.config.AzurePrefix + path;

        const blob = this.client.getBlockBlobClient(path);

        return await blob.exists();
    }

    /**
     * Download a file from Azure
     *
     * @param {String} path Partial path fragment to file ie: aoi-1.tiff
     * @param {Stream} res Stream to pipe geotiff to (usually express response object)
     */
    async download(path, res) {
        path = this.config.AzurePrefix + path;

        const blob = this.client.getBlockBlobClient(path);
        const dwn = await blob.download(0);

        dwn.readableStreamBody.pipe(res);
    }
}

module.exports = Storage;
