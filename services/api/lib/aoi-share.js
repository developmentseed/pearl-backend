const Err = require('./error');
const moment = require('moment');
const {
    BlobSASPermissions,
    BlobServiceClient
} = require('@azure/storage-blob');

class AOIShare {
    constructor(config) {
        this.pool = config.pool;
        this.config = config;

        // don't access these services unless AzureStorage is truthy
        if (this.config.AzureStorage) {
            this.blob_client = BlobServiceClient.fromConnectionString(this.config.AzureStorage);
            this.container_client = this.blob_client.getContainerClient('aois');
        }
    }

    /**
     * Return a sharing URL that can be used to titiler
     *
     * @param {string} uuid UUID of share tiff
     */
    async url(uuid) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'AOI Share storage not configured');

        const url = new URL(await this.container_client.generateSasUrl({
            permissions: BlobSASPermissions.parse('r').toString(),
            expiresOn: moment().add(365, 'days')
        }));

        url.pathname = `/aois/share-${uuid}.tiff`;

        return url;
    }

    /**
     * Return a Row as a JSON Object
     *
     * @param {Object} row Postgres Database Row
     *
     * @returns {Object}
     */
    static json(row) {
        const def = {
            project_id: parseInt(row.project_id),
            aoi_id: parseInt(row.aoi_id),
            created: row.created,
            storage: row.storage,
            uuid: row.uuid,
            patches: row.patches
        };

        if (typeof row.bounds === 'object') {
            def.bounds = row.bounds;
        } else {
            try {
                def.bounds = JSON.parse(row.bounds);
            } catch (err) {
                // Ignore Errors
            }
        }

        return def;
    }

    /**
     * Upload an AOI patch geotiff and mark the AOI patch storage property as true
     *
     * @param {String} uuid AOI Share UUID to upload to
     * @param {Object} file File Stream to upload
     */
    async upload(shareuuid, file) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'AOI storage not configured');

        const blockBlobClient = this.container_client.getBlockBlobClient(`share-${shareuuid}.tiff`);

        try {
            await blockBlobClient.uploadStream(file, 1024 * 1024 * 4, 1024 * 1024 * 20, {
                blobHTTPHeaders: { blobContentType: 'image/tiff' }
            });
        } catch (err) {
            throw new Err(500, err, 'Failed to upload AOI Share');
        }

        return await this.patch(shareuuid, {
            storage: true
        });
    }

    /**
     * Download an AOI patch geotiff
     *
     * @param {Number} aoiid AOI ID to download
     * @param {Number} patchid Patch ID to download
     * @param {Stream} res Stream to pipe geotiff to (usually express response object)
     */
    async download(aoiid, patchid, res) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'AOI storage not configured');

        const aoi = await this.get(aoiid);
        if (!aoi.storage) throw new Err(404, null, 'AOI has not been uploaded');

        const blob_client = this.container_client.getBlockBlobClient(`aoi-${aoiid}-patch-${patchid}.tiff`);
        const dwn = await blob_client.download(0);

        dwn.readableStreamBody.pipe(res);
    }

    /**
     * Delete an AOI Share
     *
     * @param {Number} aoiid - Specific AOI id
     * @param {String} shareuuid - Specific AOI Share UUID
     */
    async delete(aoiid, shareuuid) {
        let pgres;
        try {
            pgres = await this.pool.query(`
                DELETE
                    FROM
                        aois_share
                    WHERE
                        aoi_id = $1
                        AND uuid = $2
                    RETURNING *
            `, [
                aoiid,
                shareuuid
            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to delete AOI Share');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Share not found');

        if (pgres.rows[0].storage && this.config.AzureStorage) {
            const blob_client = this.container_client.getBlockBlobClient(`share-${shareuuid}.tiff`);
            await blob_client.delete();
        }

        return true;
    }

    /**
     * Update AOI Share properties
     *
     * @param {Number} shareuuid - Specific AOI Share uuid
     * @param {Object} share AOI Share Object
     * @param {Boolean} share.storage Has the storage been uploaded
     */
    async patch(shareuuid, share) {
        let pgres;
        try {
            pgres = await this.pool.query(`
                UPDATE aois_share
                    SET
                        storage = COALESCE($2, storage)
                    WHERE
                        uuid = $1
                    RETURNING *
            `, [
                shareuuid,
                share.storage
            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update AOI Share');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Share not found');

        return AOIShare.json(pgres.rows[0]);
    }

    /**
     * Return a single aoi
     *
     * @param {Number} patchid - Specific AOI id
     */
    async get(patchid) {
        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    id,
                    aoi_id,
                    project_id,
                    created,
                    storage
                FROM
                    aoi_patch
                WHERE
                    id = $1
            `, [
                patchid

            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to get AOI Patch');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Patch not found');

        return AOIShare.json(pgres.rows[0]);
    }

    /**
     * Return a list of AOI Shares
     *
     * @param {Number} projectid - AOI Shares related to a specific project
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     */
    async list(projectid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        const where = [];
        where.push(`project_id = ${projectid}`);

        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    count(*) OVER() AS count,
                    uuid,
                    aoi_id,
                    created,
                    storage
                FROM
                    aois_share
                WHERE
                    ${where.join(' AND ')}
                LIMIT
                    $1
                OFFSET
                    $2
            `, [
                query.limit,
                query.page

            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list AOI Shares');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            project_id: projectid,
            shares: pgres.rows.map((row) => {
                return {
                    uuid: row.uuid,
                    aoi_id: parseInt(row.aoi_id),
                    created: row.created,
                    storage: row.storage
                };
            })
        };
    }

    /**
     * Create a new AOI Share
     *
     * @param {AOI} aoi - AOI JSON
     */
    async create(aoi) {
        let pgres;
        try {
            pgres = await this.pool.query(`
                INSERT INTO aois_share (
                    project_id,
                    aoi_id,
                    bounds,
                    patches
                ) VALUES (
                    $1,
                    $2,
                    ST_SetSRID(ST_GeomFromGeoJSON($3), 4326),
                    $4
                ) RETURNING *
            `, [
                aoi.project_id,
                aoi.id,
                aoi.bounds,
                aoi.patches
            ]);
        } catch (err) {
            throw new Err(500, err, 'Failed to create AOI Share');
        }

        return AOIShare.json(pgres.rows[0]);
    }
}

module.exports = {
    AOIShare
};
