const { Err } = require('@openaddresses/batch-schema');
const Project = require('./project');
const Generic = require('./generic');
const Storage = require('./storage');
const { sql } = require('slonik');

/**
 * @class
 */
class AOI extends Generic {
    static _table = 'aois';
    static _res = require('../schema/res.AOI.json');
    static _patch = require('../schema/req.body.PatchAOI.json');

    constructor() {
        super();
    }

    /**
     * Return a list of aois
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     *
     * @param {Number} projectid - AOIS related to a specific project
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     * @param {Number} [query.checkpointid] - Only return AOIs related to a given Checkpoint
     * @param {String} [query.bookmarked] - Only return AOIs of this bookmarked state. Allowed true or false. By default returns all.
     * @param {String} [query.sort] - Sort AOI list by ascending or descending order of the created timestamp. Allowed asc or desc. Default desc.
     */
    static async list(pool, projectid, query) {
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
            pgres = await pool.query(sql`
               SELECT
                    count(*) OVER() AS count,
                    a.id AS id,
                    a.name AS name,
                    a.patches AS patches,
                    a.px_stats AS px_stats,
                    a.bookmarked AS bookmarked,
                    a.bookmarked_at AS bookmarked_at,
                    a.bounds AS bounds,
                    Round(ST_Area(a.bounds::GEOGRAPHY)) AS area,
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
                    ${query.page * query.limit}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list AOIs');
        }

        const list = this.deserialize(pgres.rows);
        list.project_id = projectid;

        return list;
    }

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} aoiid AOI the user is attemping to access
     */
    static async has_auth(pool, auth, projectid, aoiid) {
        const proj = await Project.has_auth(pool, auth, projectid);
        const aoi = await AOI.from(pool, aoiid);

        if (aoi.project_id !== proj.id) {
            throw new Err(400, null, `AOI #${aoiid} is not associated with project #${projectid}`);
        }

        return aoi;
    }

    /**
     * Return a sharing URL that can be used to titiler
     *
     * @param {Config} config
     */
    async url(config) {
        if (!this.storage) throw new Err(404, null, 'AOI has not been uploaded');

        const storage = new Storage(config, 'aois');
        return await storage.url(`aoi-${this.id}.tiff`);
    }

    /**
     * Upload an AOI geotiff and mark the AOI storage property as true
     *
     * @param {Config} config
     * @param {Object} file File Stream to upload
     */
    async upload(config, file) {
        if (this.storage) throw new Err(404, null, 'AOI has already been uploaded');

        const storage = new Storage(config, 'aois');
        await storage.upload(file, `aoi-${this.id}.tiff`);
        this.storage = true;

        return await this.commit(config.pool);
    }

    /**
     * Download an AOI geotiff fabric
     *
     * @param {Config} config
     */
    async exists(config) {
        if (!this.storage) throw new Err(404, null, 'AOI has not been uploaded');

        const storage = new Storage(config, 'aois');
        return await storage.exists(`aoi-${this.id}.tiff`);
    }

    /**
     * Download an AOI geotiff fabric
     *
     * @param {Config} config
     * @param {Stream} res Stream to pipe geotiff to (usually express response object)
     */
    async download(config, res) {
        if (!this.storage) throw new Err(404, null, 'AOI has not been uploaded');

        const storage = new Storage(config, 'aois');
        return await storage.download(`aoi-${this.id}.tiff`, res);
    }

    /**
     * Delete an AOI
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     */
    async delete(pool) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                UPDATE aois
                    SET
                        archived = true
                    WHERE
                        id = ${this.id}
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
     * @param {Pool} pool - Instantiated Postgres Pool
     */
    async commit(pool) {
        let bookmarked_at;
        if (this.bookmarked && !this.bookmarked_at) {
            bookmarked_at = sql`NOW()`;
        } else if (this.bookmarked) {
            bookmarked_at = sql`bookmarked_at`;
        } else {
            bookmarked_at = null;
        }

        let pgres;
        try {
            pgres = await pool.query(sql`
                UPDATE aois
                    SET
                        storage = ${this.storage},
                        name = ${this.name},
                        bookmarked = ${this.bookmarked},
                        bookmarked_at = ${bookmarked_at},
                        patches = ${this.patches ? sql.array(this.patches, sql`BIGINT[]`) : null},
                        px_stats = ${this.px_stats ? JSON.stringify(this.px_stats) : null}::JSONB
                    WHERE
                        id = ${this.id}
                    RETURNING
                        *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update AOI');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI not found');

        this.bookmarked_at = pgres.rows[0].bookmarked_at;

        return this;
    }

    /**
     * Return a single aoi
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Number} id - Specific AOI id
     */
    static async from(pool, id) {
        let pgres;
        try {
            pgres = await pool.query(sql`
               SELECT
                    a.id AS id,
                    a.name AS name,
                    a.bounds AS bounds,
                    Round(ST_Area(a.bounds::GEOGRAPHY)) AS area,
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
                    a.id = ${id}
                AND
                    a.checkpoint_id = c.id
                AND
                    a.archived = false
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to get AOI');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'aoi not found');

        return this.deserialize(pgres.rows[0]);
    }

    /**
     * Create a new AOI
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     *
     * @param {Object} aoi - AOI Object
     * @param {Number} aoi.project_id - Project the AOI is part of
     * @param {String} aoi.name - Human Readable Name
     * @param {Number} aoi.checkpoint_id - Checkpoint ID
     * @param {Object} aoi.bounds - Bounds GeoJSON
     */
    static async generate(pool, aoi) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                INSERT INTO aois (
                    project_id,
                    name,
                    checkpoint_id,
                    bounds
                ) VALUES (
                    ${aoi.project_id},
                    ${aoi.name},
                    ${aoi.checkpoint_id},
                    ST_GeomFromGeoJSON(${JSON.stringify(aoi.bounds)})
                ) RETURNING
                    id,
                    name,
                    bounds,
                    Round(ST_Area(bounds::GEOGRAPHY)) AS area,
                    project_id,
                    bookmarked,
                    bookmarked_at,
                    checkpoint_id,
                    created,
                    storage,
                    patches,
                    px_stats
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to create AOI');
        }

        return this.deserialize(pgres.rows[0]);
    }
}

module.exports = AOI;
