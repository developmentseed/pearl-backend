const Err = require('./error');
const Storage = require('./storage');
const { sql } = require('slonik');
const Generic = require('./generic');

/**
 * @class
 */
class AOIShare extends Generic {
    static _table = 'aois_share';
    static _patch = Object.keys(require('../schema/req.body.PatchShare.json').properties);
    static _res = require('../schema/res.Share.json');

    constructor() {
        super();
    }

    /**
     * Return a list of AOI Shares
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Number} projectid - AOI Shares related to a specific project
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     * @param {Number} query.aoi_id - Specfic AOI to filter for
     */
    static async list(pool, projectid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        if (query.aoi === undefined) query.aoi = null;

        let pgres;
        try {
            pgres = await pool.query(sql`
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
                    ${query.page * query.limit}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list AOI Shares');
        }

        const list = AOIShare.deserialize(pgres.rows, 'shares');
        list.project_id = projectid;
        return list;
    }

    /**
     * Return a sharing URL that can be used to titiler
     *
     * @param {Config} config
     */
    async url(config) {
        if (!this.storage) throw new Err(404, null, 'AOI Share has not been uploaded');

        const storage = new Storage(config, 'aois');
        return await storage.url(`share-${this.uuid}.tiff`);
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
        if (this.storage) throw new Err(404, null, 'AOI Share has already been uploaded');

        const storage = new Storage(this.config, 'aois');
        await storage.upload(file, `share-${shareuuid}.tiff`);

        return await this.patch(shareuuid, {
            storage: true
        });
    }

    /**
     * Download an AOI share geotiff
     *
     * @param {Number} shareuuid AOI ID to download
     * @param {Stream} res Stream to pipe geotiff to (usually express response object)
     */
    async download(shareuuid, res) {
        const aoi = await this.get(shareuuid);
        if (!aoi.storage) throw new Err(404, null, 'AOI Share has not been uploaded');

        const storage = new Storage(this.config, 'aois');
        await storage.download(`share-${shareuuid}.tiff`, res);
    }

    /**
     * Delete an AOI Share
     *
     * @param {Config} config
     */
    async delete(config) {
        let pgres;
        try {
            pgres = await config.pool.query(sql`
                DELETE
                    FROM
                        aois_share
                    WHERE
                        aoi_id = ${this.aoi_id}
                        AND uuid = ${this.uuid}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to delete AOI Share');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Share not found');

        if (pgres.rows[0].storage && config.AzureStorage) {
            const storage = new Storage(config, 'aois');
            await storage.delete(`share-${this.uuid}.tiff`);
        }

        return true;
    }

    /**
     * Update AOI Share properties
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     */
    async commit(pool) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                UPDATE aois_share
                    SET
                        storage = ${this.storage}
                    WHERE
                        uuid = ${this.uuid}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update AOI Share');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Share not found');

        return this;
    }

    /**
     * Return a single aoi share
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {String} shareuuid - Specific AOI Share UUID
     */
    static async from(pool, shareuuid) {
        let pgres;
        try {
            pgres = await pool.query(sql`
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

        return AOIShare.deserialize(pgres.rows[0]);
    }


    /**
     * Create a new AOI Share
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Object} share - AOI Share
     */
    static async generate(pool, share) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                INSERT INTO aois_share (
                    project_id,
                    aoi_id,
                    bounds,
                    patches
                ) VALUES (
                    ${share.project_id},
                    ${share.id},
                    ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(share.bounds)}), 4326),
                    ${sql.array(share.patches,  sql`BIGINT[]`)}
                ) RETURNING *
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to create AOI Share');
        }

        return AOIShare.deserialize(pgres.rows[0]);
    }
}

module.exports = AOIShare;
