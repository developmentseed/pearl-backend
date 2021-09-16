const Err = require('./error');
const Project = require('./project');
const moment = require('moment');
const {
    BlobSASPermissions,
    BlobServiceClient
} = require('@azure/storage-blob');

const { sql } = require('slonik');

class AOI {
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
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} aoiid AOI the user is attemping to access
     */
    async has_auth(pool, auth, projectid, aoiid) {
        const proj = await Project.has_auth(pool, auth, projectid);
        const aoi = await this.get(aoiid);

        if (aoi.project_id !== proj.id) {
            throw new Err(400, null, `AOI #${aoiid} is not associated with project #${projectid}`);
        }

        return aoi;
    }

    /**
     * Return a sharing URL that can be used to titiler
     *
     * @param {Number} aoiid AOI ID to get a share URL for
     */
    async url(aoiid) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'AOI storage not configured');

        const url = new URL(await this.container_client.generateSasUrl({
            permissions: BlobSASPermissions.parse('r').toString(),
            expiresOn: moment().add(365, 'days')
        }));

        url.pathname = `/aois/aoi-${aoiid}.tiff`;

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
            name: row.name,
            created: row.created,
            storage: row.storage,
            bookmarked: row.bookmarked,
            bookmarked_at: row.bookmarked_at,
            project_id: parseInt(row.project_id),
            checkpoint_id: parseInt(row.checkpoint_id),
            patches: row.patches.map((patch) => { return parseInt(patch); }),
            px_stats: row.px_stats ? row.px_stats : {}
        };

        if (row.classes) {
            def['classes'] = row.classes;
        }

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

        const blockBlobClient = this.container_client.getBlockBlobClient(`aoi-${aoiid}.tiff`);

        try {
            await blockBlobClient.uploadStream(file, 1024 * 1024 * 4, 1024 * 1024 * 20, {
                blobHTTPHeaders: { blobContentType: 'image/tiff' }
            });
        } catch (err) {
            throw new Err(500, err, 'Failed to upload AOI');
        }

        return await this.patch(aoiid, {
            storage: true
        });
    }

    /**
     * Download an AOI geotiff fabric
     *
     * @param {Number} aoiid AOI ID to check for existance
     */
    async exists(aoiid) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'AOI storage not configured');

        const aoi = await this.get(aoiid);
        if (!aoi.storage) throw new Err(404, null, 'AOI has not been uploaded');

        const blob_client = this.container_client.getBlockBlobClient(`aoi-${aoiid}.tiff`);
        return await blob_client.exists();
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

        const blob_client = this.container_client.getBlockBlobClient(`aoi-${aoiid}.tiff`);
        const dwn = await blob_client.download(0);

        dwn.readableStreamBody.pipe(res);
    }

    /**
     * Delete an AOI
     *
     * @param {Number} aoiid - Specific AOI id
     */
    async delete(aoiid) {
        let pgres;
        try {
            pgres = await this.pool.query(sql`
                UPDATE aois
                    SET
                        archived = true
                    WHERE
                        id = ${aoiid}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to delete AOI');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI not found');

        return true;
    }

    /**
     * Update AOI properties
     *
     * @param {Number} aoiid - Specific AOI id
     * @param {Object} aoi AOI Object
     * @param {Boolean} aoi.storage Has the storage been uploaded
     * @param {String} aoi.name - Human Readable Name
     * @param {Boolean} aoi.bookmarked Has the aoi been bookmarked by the user
     * @param {Number[]} aoi.patches List of patches in order of application on export
     */
    async patch(aoiid, aoi) {
        let pgres;
        try {
            let bookmarked_at;
            if (aoi.bookmarked !== undefined) {
                if (aoi.bookmarked) {
                    bookmarked_at = sql`NOW()`;
                } else {
                    bookmarked_at = null;
                }
            }
            pgres = await this.pool.query(sql`
                UPDATE aois
                    SET
                        storage = COALESCE(${aoi.storage || null}, storage),
                        name = COALESCE(${aoi.name || null}, name),
                        bookmarked = ${aoi.bookmarked !== undefined ? aoi.bookmarked : sql`COALESCE(bookmarked)`},
                        bookmarked_at = ${bookmarked_at !== undefined ? bookmarked_at : sql`COALESCE(bookmarked_at)`},
                        patches = COALESCE(${aoi.patches ? sql.array(aoi.patches, sql`BIGINT[]`) : null}, patches),
                        px_stats = COALESCE(${aoi.px_stats ? JSON.stringify(aoi.px_stats) : null}::JSONB, px_stats)
                    WHERE
                        id = ${aoiid}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update AOI');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI not found');

        return AOI.json(pgres.rows[0]);
    }

    /**
     * Return a single aoi
     *
     * @param {Number} aoiid - Specific AOI id
     */
    async get(aoiid) {
        let pgres;
        try {
            pgres = await this.pool.query(sql`
               SELECT
                    a.id AS id,
                    a.name AS name,
                    ST_AsGeoJSON(a.bounds)::JSON AS bounds,
                    a.project_id AS project_id,
                    a.bookmarked AS bookmarked,
                    a.bookmarked_at AS bookmarked_at,
                    a.checkpoint_id AS checkpoint_id,
                    a.created AS created,
                    a.storage AS storage,
                    a.patches AS patches,
                    a.px_stats AS px_stats,
                    c.classes as classes
                FROM
                    aois a,
                    checkpoints c
                WHERE
                    a.id = ${aoiid}
                AND
                    a.checkpoint_id = c.id
                AND
                    a.archived = false
            `);
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
     * @param {Number} [query.checkpointid] - Only return AOIs related to a given Checkpoint
     * @param {String} [query.bookmarked] - Only return AOIs of this bookmarked state. Allowed true or false. By default returns all.
     * @param {String} [query.sort] - Sort AOI list by ascending or descending order of the created timestamp. Allowed asc or desc. Default desc.
     */
    async list(projectid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        if (!query.sort || query.sort === 'desc') {
            query.sort = sql`desc`;
        } else {
            query.sort = sql`asc`;
        }

        if (query.checkpointid === undefined) query.checkpointid = null;
        if (query.bookmarked === undefined) query.bookmarked = null;

        let pgres;
        try {
            pgres = await this.pool.query(sql`
               SELECT
                    count(*) OVER() AS count,
                    a.id AS id,
                    a.name AS name,
                    a.px_stats AS px_stats,
                    a.bookmarked AS bookmarked,
                    a.bookmarked_at AS bookmarked_at,
                    ST_AsGeoJSON(a.bounds)::JSON AS bounds,
                    a.created AS created,
                    a.storage AS storage,
                    a.checkpoint_id AS checkpoint_id,
                    c.name AS checkpoint_name,
                    c.classes AS classes
                FROM
                    aois a,
                    checkpoints c
                WHERE
                    a.checkpoint_id = c.id
                    AND a.project_id = ${projectid}
                    AND (${query.checkpointid}::BIGINT IS NULL OR checkpoint_id = ${query.checkpointid})
                    AND (${query.bookmarked}::BOOLEAN IS NULL OR a.bookmarked = ${query.bookmarked})
                    AND a.archived = false
                ORDER BY
                    a.created ${query.sort}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list aois');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            project_id: projectid,
            aois: pgres.rows.map((row) => {
                return {
                    id: parseInt(row.id),
                    name: row.name,
                    bookmarked: row.bookmarked,
                    bookmarked_at: row.bookmarked_at,
                    bounds: row.bounds,
                    px_stats: row.px_stats,
                    created: row.created,
                    storage: row.storage,
                    checkpoint_id: row.checkpoint_id,
                    checkpoint_name: row.checkpoint_name,
                    classes: row.classes
                };
            })
        };
    }

    /**
     * Create a new AOI
     *
     * @param {Number} projectid - AOIS related to a specific project
     * @param {Object} aoi - AOI Object
     * @param {Object} aoi.bounds - Bounds GeoJSON
     * @param {Number} aoi.checkpoint_id - Checkpoint ID
     * @param {String} aoi.name - Human Readable Name
     */
    async create(projectid, aoi) {
        let pgres;
        try {
            pgres = await this.pool.query(sql`
                INSERT INTO aois (
                    project_id,
                    name,
                    checkpoint_id,
                    bounds
                ) VALUES (
                    ${projectid},
                    ${aoi.name},
                    ${aoi.checkpoint_id},
                    ST_GeomFromGeoJSON(${JSON.stringify(aoi.bounds)})
                ) RETURNING *
            `);
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
