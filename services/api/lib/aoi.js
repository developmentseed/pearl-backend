'use strict';

const Err = require('./error');
const { BlobServiceClient } = require('@azure/storage-blob');

class AOI {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;

        // don't access these services unless AzureStorage is truthy
        if (this.config.AzureStorage) {
            this.blob_client = BlobServiceClient.fromConnectionString(this.config.AzureStorage);
            this.container_client = this.blob_client.getContainerClient('aois');
        }
    }

    /**
     * Upload an AOI geotiff and mark the AOI storage property as true
     *
     * @param {Number} aoiid AOI ID to upload to
     * @param {Object} file File Stream to upload
     */
    async upload(aoiid, file) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'AOI storage not configured');

        const blockBlobClient = this.container_client.getBlockBlobClient(`aoi-${aoiid}.geotiff`);

        try {
            await blockBlobClient.uploadStream(file, 1024 * 1024 * 4, 1024 * 1024 * 20, {
                blobHTTPHeaders: { blobContentType: 'image/tiff' }
            });
        } catch (err) {
            throw new Err(500, err, 'Failed to uploda AOI');
        }

        return await this.patch(aoiid, {
            storage: true
        });
    }

    /**
     * Download an AOI geotiff fabric
     *
     * @param {Number} aoiid AOI ID to download
     * @param {Stream} res Stream to pipe geotiff to (usually express response object)
     */
    async download(aoiid, res) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'AOI storage not configured');

        const aoi = await this.get(aoiid);
        if (!aoi.storage) throw new Err(404, null, 'AOI has not been uploaded');

        const blob_client = this.container_client.getBlockBlobClient(`aoi-${aoiid}.geotiff`);
        const dwn = await blob_client.download(0);

        dwn.readableStreamBody.pipe(res);
    }


    /**
     * Update AOI properties
     *
     * @param {Number} aoiid - Specific AOI id
     * @param {Object} aoi AOI Object
     * @param {Boolean} aoi.storage Has the storage been uploaded
     */
    async patch(aoiid, aoi) {
        let pgres;
        try {
            pgres = await this.pool.query(`
                UPDATE aois
                    SET
                        storage = COALESCE($2, storage)
                    WHERE
                        id = $1
                    RETURNING *
            `, [
                aoiid,
                aoi.storage
            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update AOI');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI not found');

        const row = pgres.rows[0];
        return {
            id: parseInt(row.id),
            bounds: row.bounds,
            created: row.created,
            storage: row.storage
        };
    }

    /**
     * Return a single aoi
     *
     * @param {Number} aoiid - Specific AOI id
     */
    async get(aoiid) {
        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    id,
                    ST_AsGeoJSON(bounds)::JSON,
                    created,
                    storage
                FROM
                    aois
                WHERE
                    aois.id = $1
            `, [
                aoiid

            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to get AOI');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI not found');

        const row = pgres.rows[0];
        return {
            id: parseInt(row.id),
            bounds: row.bounds,
            created: row.created,
            storage: row.storage
        };
    }

    /**
     * Return a list of aois
     *
     * @param {Number} projectid - AOIS related to a specific project
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     */
    async list(projectid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    ST_AsGeoJSON(bounds)::JSON,
                    created,
                    storage
                FROM
                    aois
                WHERE
                    project_id = $3
                LIMIT
                    $1
                OFFSET
                    $2
            `, [
                query.limit,
                query.page,
                projectid

            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list aois');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            project_id: projectid,
            aois: pgres.rows.map((row) => {
                return {
                    id: parseInt(row.id),
                    bounds: row.bounds,
                    created: row.created,
                    storage: row.storage
                };
            })
        };
    }

    /**
     * Create a new AOI
     *
     * @param {Number} projectid - AOIS related to a specific project
     * @param {Object} aoi - AOI Object
     * @param {Object} aoi.bounds - AOI Bounds GeoJSON
     */
    async create(projectid, aoi) {
        try {
            const pgres = await this.pool.query(`
                INSERT INTO aois (
                    project_id,
                    bounds
                ) VALUES (
                    $1,
                    ST_GeomFromGeoJSON($2)
                ) RETURNING *
            `, [
                projectid,
                aoi.bounds
            ]);

            return {
                id: parseInt(pgres.rows[0].id),
                project_id: projectid,
                created: pgres.rows[0].created,
                bounds: aoi.bounds,
                storage: pgres.rows[0].storage
            };
        } catch (err) {
            throw new Err(500, err, 'Failed to create aoi');
        }
    }
}

module.exports = {
    AOI
};
