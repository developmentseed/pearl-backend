'use strict';

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
            id: parseInt(row.id),
            project_id: parseInt(row.project_id),
            created: row.created,
            storage: row.storage,
            uuid: row.uuid,
            patches: row.patches,
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
     * @param {Number} aoiid AOI ID to upload to
     * @param {Number} patchid AOI Patch ID to upload to
     * @param {Object} file File Stream to upload
     */
    async upload(aoiid, patchid, file) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'AOI storage not configured');

        const blockBlobClient = this.container_client.getBlockBlobClient(`aoi-${aoiid}-patch-${patchid}.tiff`);

        try {
            await blockBlobClient.uploadStream(file, 1024 * 1024 * 4, 1024 * 1024 * 20, {
                blobHTTPHeaders: { blobContentType: 'image/tiff' }
            });
        } catch (err) {
            throw new Err(500, err, 'Failed to upload AOI Patch');
        }

        return await this.patch(patchid, {
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
     * Delete an AOI Patch
     *
     * @param {Number} aoiid - Specific AOI id
     * @param {Number} patchid - Specific AOI Patch id
     */
    async delete(aoiid, patchid) {
        let pgres;
        try {
            pgres = await this.pool.query(`
                DELETE
                    FROM
                        aoi_patch
                    WHERE
                        id = $1
                    RETURNING *
            `, [
                patchid
            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to delete AOI Patch');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Patch not found');

        if (pgres.rows[0].storage && this.config.AzureStorage) {
            const blob_client = this.container_client.getBlockBlobClient(`aoi-${aoiid}-patch-${patchid}.tiff`);
            await blob_client.delete();
        }

        return true;
    }

    /**
     * Update AOI Patch properties
     *
     * @param {Number} patchid - Specific AOI Patch id
     * @param {Object} patch AOI Object
     * @param {Boolean} patch.storage Has the storage been uploaded
     */
    async patch(patchid, patch) {
        let pgres;
        try {
            pgres = await this.pool.query(`
                UPDATE aoi_patch
                    SET
                        storage = COALESCE($2, storage)
                    WHERE
                        id = $1
                    RETURNING *
            `, [
                patchid,
                patch.storage
            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update AOI Patch');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Patch not found');

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
     * Return a list of AOI Patches
     *
     * @param {Number} projectid - AOI Patches related to a specific project
     * @param {Number} aoiid - AOI Patches related to a specific AOI
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     */
    async list(projectid, aoiid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        const where = [];
        where.push(`project_id = ${projectid}`);
        where.push(`aoi_id = ${aoiid}`);

        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    created,
                    storage
                FROM
                    aoi_patch
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
            throw new Err(500, new Error(err), 'Failed to list AOI Patches');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            project_id: projectid,
            aoi_id: aoiid,
            patches: pgres.rows.map((row) => {
                return {
                    id: parseInt(row.id),
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
                INSERT INTO aoi_share (
                    project_id,
                    bounds,
                    patches
                ) VALUES (
                    $1,
                    ST_SetSRID(ST_GeomFromGeoJSON($2), 4326),
                    $3
                ) RETURNING *
            `, [
                ,
                aoi.project_id,
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
