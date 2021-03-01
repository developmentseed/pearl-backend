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
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Project} project Instantiated Project class
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} aoiid AOI the user is attemping to access
     */
    async has_auth(project, auth, projectid, aoiid) {
        const proj = await project.has_auth(auth, projectid);
        const aoi = await this.get(aoiid);

        if (aoi.project_id !== proj.id) {
            throw new Err(400, null, `AOI #${aoiid} is not associated with project #${projectid}`);
        }

        return aoi;
    }

    /**
     * Return a Row as a JSON Object
     * @param {Object} row Postgres Database Row
     */
    static json(row) {
        const def = {
            id: parseInt(row.id),
            created: row.created,
            storage: row.storage,
            project_id: parseInt(row.project_id)
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

        AOI.json(pgres.rows[0]);
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
                    ST_AsGeoJSON(bounds)::JSON AS bounds,
                    project_id,
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

        return AOI.json(pgres.rows[0]);
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
        let pgres;
        try {
            pgres = await this.pool.query(`
                INSERT INTO aois (
                    project_id,
                    bounds
                ) VALUES (
                    $1,
                    ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)
                ) RETURNING *
            `, [
                projectid,
                aoi.bounds
            ]);

        } catch (err) {
            throw new Err(500, err, 'Failed to create aoi');
        }

        pgres.rows[0].bounds = aoi.bounds;
        return AOI.json(pgres.rows[0]);
    }
}

module.exports = {
    AOI
};
