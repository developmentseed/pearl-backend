'use strict';

const Err = require('./error');
const moment = require('moment');
const {
    BlobSASPermissions,
    BlobServiceClient
} = require('@azure/storage-blob');

const { sql } = require('slonik');

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
            patches: row.patches,
            checkpoint_id: row.checkpoint_id,
            classes: row.classes
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
     * Upload an AOI share geotiff and mark the AOI share storage property as true
     *
     * @param {String} shareuuid AOI Share UUID to upload to
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

        const patch = await this.patch(shareuuid, {
            storage: true
        });

        return patch;
    }

    /**
     * Download an AOI share geotiff
     *
     * @param {Number} shareuuid AOI ID to download
     * @param {Stream} res Stream to pipe geotiff to (usually express response object)
     */
    async download(shareuuid, res) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'AOI Share storage not configured');

        const aoi = await this.get(shareuuid);
        if (!aoi.storage) throw new Err(404, null, 'AOI Share has not been uploaded');

        const blockBlobClient = this.container_client.getBlockBlobClient(`share-${shareuuid}.tiff`);
        const dwn = await blockBlobClient.download(0);

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
            pgres = await this.pool.query(sql`
                DELETE
                    FROM
                        aois_share
                    WHERE
                        aoi_id = ${aoiid}
                        AND uuid = ${shareuuid}
                    RETURNING *
            `);
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
            pgres = await this.pool.query(sql`
                UPDATE aois_share
                    SET
                        storage = COALESCE(${share.storage}, storage)
                    WHERE
                        uuid = ${shareuuid}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update AOI Share');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Share not found');

        return AOIShare.json(pgres.rows[0]);
    }

    /**
     * Return a single aoi share
     *
     * @param {String} shareuuid - Specific AOI Share UUID
     */
    async get(shareuuid) {
        let pgres;
        try {
            pgres = await this.pool.query(sql`
               SELECT
                    s.uuid AS uuid,
                    s.aoi_id AS aoi_id,
                    s.project_id AS project_id,
                    ST_AsGeojson(s.bounds)::JSON AS bounds,
                    s.created AS created,
                    s.storage AS storage,
                    a.checkpoint_id AS checkpoint_id,
                    c.classes AS classes
                FROM
                    aois_share s,
                    aois a,
                    checkpoints c
                WHERE
                    s.uuid = ${shareuuid}
                AND
                    a.id = s.aoi_id
                AND
                    c.id = a.checkpoint_id
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to get AOI Share');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Share not found');

        return AOIShare.json(pgres.rows[0]);
    }

    /**
     * Return a list of AOI Shares
     *
     * @param {Number} projectid - AOI Shares related to a specific project
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     * @param {Number} query.aoi_id - Specfic AOI to filter for
     */
    async list(projectid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        let pgres;
        try {
            pgres = await this.pool.query(sql`
               SELECT
                    count(*) OVER() AS count,
                    uuid,
                    aoi_id,
                    created,
                    storage
                FROM
                    aois_share
                WHERE
                    project_id = ${projectid}
                    AND (${query.aoi}::BIGINT IS NULL OR aoi_id = ${query.aoi})
                ORDER BY
                    created DESC
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page}
            `);
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
            pgres = await this.pool.query(sql`
                INSERT INTO aois_share (
                    project_id,
                    aoi_id,
                    bounds,
                    patches
                ) VALUES (
                    ${aoi.project_id},
                    ${aoi.id},
                    ST_SetSRID(ST_GeomFromGeoJSON(${aoi.bounds}), 4326),
                    ${aoi.patches}
                ) RETURNING *
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to create AOI Share');
        }

        return AOIShare.json(pgres.rows[0]);
    }
}

module.exports = {
    AOIShare
};
