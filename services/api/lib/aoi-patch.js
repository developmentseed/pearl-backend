const { Err } = require('@openaddresses/batch-schema');
const Generic = require('@openaddresses/batch-generic');
const AOI = require('./aoi');
const Storage = require('./storage');
const { sql } = require('slonik');

/**
 * @class
 */
class AOIPatch extends Generic {
    static _table = 'aoi_patch';
    static _patch = require('../schema/req.body.PatchPatch.json');
    static _res = require('../schema/res.Patch.json');

    /**
     * Return a list of AOI Patches
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Number} projectid - AOI Patches related to a specific project
     * @param {Number} aoiid - AOI Patches related to a specific AOI
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     */
    static async list(pool, projectid, aoiid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        let pgres;
        try {
            pgres = await pool.query(sql`
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
                    ${query.page * query.limit}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list AOI Patches');
        }

        const list = this.deserialize(pgres.rows, 'patches');
        list.project_id = projectid;
        list.aoi_id = aoiid;
        return list;
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
    static async has_auth(pool, auth, projectid, aoiid, patchid) {
        const a = await AOI.has_auth(pool, auth, projectid, aoiid);
        const patch = await AOIPatch.from(pool, patchid);

        if (patch.aoi_id !== a.id) {
            throw new Err(400, null, `AOI Patch #${patchid} is not associated with aoi #${aoiid}`);
        }

        return patch;
    }

    /**
     * Return a sharing URL that can be used to titiler
     *
     * @param {Config} config
     */
    async url(config) {
        if (!this.storage) throw new Err(404, null, 'AOI Patch has not been uploaded');

        const storage = new Storage(config, 'aois');
        return await storage.url(`aoi-${this.aoi_id}-patch-${this.id}.tiff`);
    }

    /**
     * Upload an AOI patch geotiff and mark the AOI patch storage property as true
     *
     * @param {Config} config
     * @param {Object} file File Stream to upload
     */
    async upload(config, file) {
        if (this.storage) throw new Err(404, null, 'AOI Patch has already been uploaded');

        const storage = new Storage(config, 'aois');
        await storage.upload(file, `aoi-${this.aoi_id}-patch-${this.id}.tiff`);

        this.storage = true;
        return await this.commit(config.pool);
    }

    /**
     * Download an AOI patch geotiff
     *
     * @param {Config} config
     * @param {Stream} res Stream to pipe geotiff to (usually express response object)
     */
    async download(config, res) {
        if (!this.storage) throw new Err(404, null, 'AOI has not been uploaded');

        const storage = new Storage(config, 'aois');
        await storage.download(`aoi-${this.aoi_id}-patch-${this.id}.tiff`, res);
    }

    /**
     * Delete an AOI Patch
     *
     * @param {Config} config
     */
    async delete(config) {
        let pgres;
        try {
            pgres = await config.pool.query(sql`
                DELETE
                    FROM
                        aoi_patch
                    WHERE
                        id = ${this.id}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to delete AOI Patch');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Patch not found');

        if (pgres.rows[0].storage && config.AzureStorage) {
            const storage = new Storage(config, 'aois');
            await storage.delete(`aoi-${this.aoi_id}-patch-${this.id}.tiff`);
        }

        return true;
    }

    /**
     * Update AOI Patch properties
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     */
    async commit(pool) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                UPDATE aoi_patch
                    SET
                        storage = ${this.storage}
                    WHERE
                        id = ${this.id}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update AOI Patch');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Patch not found');

        return this;
    }

    /**
     * Create a new AOI Patch
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Object} patch - AOIS related to a specific aoi
     * @param {Number} patch.project_id Project ID
     * @param {Number} patch.aoi_id AOI ID
     */
    static async generate(pool, patch) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                INSERT INTO aoi_patch (
                    project_id,
                    aoi_id
                ) VALUES (
                    ${patch.project_id},
                    ${patch.aoi_id}
                ) RETURNING *
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to create AOI Patch');
        }

        return this.deserialize(pgres.rows[0]);
    }
}

module.exports = AOIPatch;
