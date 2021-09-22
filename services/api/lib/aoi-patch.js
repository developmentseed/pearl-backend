const Err = require('./error');
const AOI = require('./aoi');
const Storage = require('./storage');
const { sql } = require('slonik');

class AOIPatch {
    constructor(config) {
        this.pool = config.pool;
        this.config = config;
    }

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} aoiid AOI the user is attemping to access
     * @param {Number} patchid AOI the user is attemping to access
     */
    async has_auth(pool, auth, projectid, aoiid, patchid) {
        const a = await AOI.has_auth(pool, auth, projectid, aoiid);
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
        if (!this.storage) throw new Err(404, null, 'AOI Patch has not been uploaded');

        const storage = new Storage(this.config, 'aois');
        return await storage.url(`aoi-${aoiid}-patch-${patchid}.tiff`);
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
        const storage = new Storage(this.config, 'aois');
        await storage.upload(file, `aoi-${aoiid}-patch-${patchid}.tiff`);

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
        const aoi = await this.get(aoiid);
        if (!aoi.storage) throw new Err(404, null, 'AOI has not been uploaded');

        const storage = new Storage(this.config, 'aois');
        await storage.download(`aoi-${aoiid}-patch-${patchid}.tiff`, res);
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
            pgres = await this.pool.query(sql`
                DELETE
                    FROM
                        aoi_patch
                    WHERE
                        id = ${patchid}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to delete AOI Patch');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Patch not found');

        if (pgres.rows[0].storage && this.config.AzureStorage) {
            const storage = new Storage(this.config, 'aois');
            await storage.delete(`aoi-${aoiid}-patch-${patchid}.tiff`);
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
            pgres = await this.pool.query(sql`
                UPDATE aoi_patch
                    SET
                        storage = COALESCE(${patch.storage}, storage)
                    WHERE
                        id = ${patchid}
                    RETURNING *
            `);
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
            pgres = await this.pool.query(sql`
               SELECT
                    id,
                    aoi_id,
                    project_id,
                    created,
                    storage
                FROM
                    aoi_patch
                WHERE
                    id = ${patchid}
            `);
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

        let pgres;
        try {
            pgres = await this.pool.query(sql`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    created,
                    storage
                FROM
                    aoi_patch
                WHERE
                    project_id = ${projectid}
                    AND aoi_id = ${aoiid}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page}
            `);
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
            pgres = await this.pool.query(sql`
                INSERT INTO aoi_patch (
                    project_id,
                    aoi_id
                ) VALUES (
                    ${projectid},
                    ${aoiid}
                ) RETURNING *
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to create AOI Patch');
        }

        return AOIPatch.json(pgres.rows[0]);
    }
}

module.exports = {
    AOIPatch
};
