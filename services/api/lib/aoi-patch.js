'use strict';

const Err = require('./error');
const moment = require('moment');
const {
    BlobSASPermissions,
    BlobServiceClient
} = require('@azure/storage-blob');

class AOIPatch {
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
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Project} project Instantiated Project class
     * @param {Project} aoi Instantiated AOI class
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} aoiid AOI the user is attemping to access
     * @param {Number} patchid AOI the user is attemping to access
     */
    async has_auth(project, aoi, auth, projectid, aoiid, patchid) {
        const a = await aoi.has_auth(project, auth, projectid, aoiid);
        const patch = await this.get(patchid);

        if (patch.aoi_id !== a.id) {
            throw new Err(400, null, `AOI Patch #${patchid} is not associated with aoi #${aoiid}`);
        }

        return patch;
    }

    /**
     * Return a sharing URL that can be used to titiler
     *
     * @param {Number} aoiid AOI ID to get a share URL for
     * @param {Number} patchid AOI Patch ID to get a share URL for
     */
    async url(aoiid, patchid) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'AOI Patch storage not configured');

        const url = new URL(await this.container_client.generateSasUrl({
            permissions: BlobSASPermissions.parse('r').toString(),
            expiresOn: moment().add(365, 'days')
        }));

        url.pathname = `aoi-${aoiid}-patch-${patchid}.tiff`;

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
            created: row.created,
            storage: row.storage,
            project_id: parseInt(row.project_id),
            aoi_id: parseInt(row.aoi_id)
        };

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
     * Delete an AOI
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
                        storage = COALESCE($2, storage),
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

        return AOIPatch.json(pgres.rows[0]);
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

        return AOIPatch.json(pgres.rows[0]);
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
                    aois
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
     * Create a new AOI Patch
     *
     * @param {Number} projectid - AOIS related to a specific project
     * @param {Number} aoiid - AOIS related to a specific aoi
     */
    async create(projectid, aoiid) {
        let pgres;
        try {
            pgres = await this.pool.query(`
                INSERT INTO aoi_patch (
                    project_id,
                    aoi_id
                ) VALUES (
                    $1,
                    $2,
                ) RETURNING *
            `, [
                projectid,
                aoiid
            ]);

        } catch (err) {
            throw new Err(500, err, 'Failed to create AOI Patch');
        }

        return AOIPatch.json(pgres.rows[0]);
    }
}

module.exports = {
    AOIPatch
};
