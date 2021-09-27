const Project = require('./project');
const Err = require('./error');
const Storage = require('./storage');
const { sql } = require('slonik');
const Generic = require('./generic');

/**
 * @class
 */
class CheckPoint extends Generic {
    static _table = 'checkpoints';
    static _res = require('../schema/res.Checkpoint.json');
    static _patch = Object.keys(require('../schema/req.body.PatchCheckpoint.json').properties);

    constructor() {
        super();
    }

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} checkpointid Checkpoint the user is attemping to access
     */
    static async has_auth(pool, auth, projectid, checkpointid) {
        const proj = await Project.has_auth(pool, auth, projectid);
        const checkpoint = await this.get(checkpointid);

        if (checkpoint.project_id !== proj.id) {
            throw new Err(400, null, `Checkpoint #${checkpointid} is not associated with project #${projectid}`);
        }

        return checkpoint;
    }

    serialize() {
        const res = super.serialize();

        console.error(res);

        if (res.retrain_geoms) {
            const counts = res.retrain_geoms.filter((geom) => {
                if (!geom) return false;
                if (!geom.coordinates.length) return false;
                return true;
            }).length;

            if (counts && this.bounds) {
                res.bounds = this.bounds.replace(/(BOX|\(|\))/g, '').split(',').join(' ').split(' ').map(cd => Number(cd));
            }

            if (counts && this.center) {
                res.center = this.center.replace(/(POINT|\(|\))/g, '').split(' ').map(cd => Number(cd));
            }
        }

        return res;
    }

    /**
     * Return a list of checkpoints for a given instance
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     *
     * @param {Number} projectid Project ID to list checkpoints for
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of checkpoints to return
     * @param {Number} [query.page=0] - Page to return
     * @param {String} [query.bookmarked] - Optional. Allowed true or false
     */
    static async list(pool, projectid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        if (query.bookmarked === undefined) query.bookmarked = null;
        if (!query.sort || query.sort === 'desc') {
            query.sort = sql`desc`;
        } else {
            query.sort = sql`asc`;
        }

        let pgres;
        try {
            pgres = await pool.query(sql`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    parent,
                    name,
                    created,
                    storage,
                    bookmarked
                FROM
                    checkpoints
                WHERE
                    project_id = ${projectid}
                    AND (${query.bookmarked}::BOOLEAN IS NULL OR bookmarked = ${query.bookmarked})
                    AND archived = false
                ORDER BY
                    created ${query.sort}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list checkpoints');
        }

        const list = CheckPoint.deserialize(pgres.rows);
        list.project_id = projectid;
        return list;
    }

    /**
     * Delete a Checkpoint
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     */
    async delete(pool) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                UPDATE checkpoints
                    SET
                        archived = true
                    WHERE
                        id = ${this.id}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to archive Checkpoint');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'Checkpoint not found');

        return true;
    }

    /**
     * Upload a Checkpoint and mark the Checkpoint storage property as true
     *
     * @param {Config} config
     * @param {Object} file File stream to upload
     */
    async upload(config, file) {
        if (this.storage) throw new Err(404, null, 'Checkpoint has already been uploaded');

        const storage = new Storage(config, 'checkpoints');
        await storage.upload(file, `checkpoint-${this.id}`, 'application/octet-stream');

        this.storage = true;
        return await this.commit(config.pool);
    }

    /**
     * Download a Checkpoint Asset
     *
     * @param {Config} config
     * @param {Stream} res Stream to pipe model to (usually express response object)
     */
    async download(config, res) {
        if (!this.storage) throw new Err(404, null, 'Checkpoint has not been uploaded');

        const storage = new Storage(config, 'checkpoints');
        await storage.download(`checkpoint-${this.id}`, res);
    }

    /**
     * Update Checkpoint Properties
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     */
    async commit(pool) {
        let pgres;

        const current = await CheckPoint.from(pool, this.id);
        if (current.classes.length !== this.classes.length) {
            throw new Err(400, null, 'Cannot change the number of classes once a checkpoint is created');
        }

        try {
            pgres = await pool.query(sql`
                UPDATE checkpoints
                    SET
                        storage = ${this.storage},
                        name = ${this.name},
                        bookmarked = ${this.bookmarked},
                        classes = ${this.classes ? JSON.stringify(this.classes) : null}::JSONB
                    WHERE
                        id = ${this.id}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update Checkpoint');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'Checkpoint not found');

        return this;
    }

    /**
     * Return a single checkpoint
     *
     * @param {Pool} - Instantiated Postgres Pool
     * @param {Number} checkpointid - Checkpoint ID to get
     */
    static async from(pool, checkpointid) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    checkpoints.id,
                    checkpoints.name,
                    checkpoints.parent,
                    checkpoints.classes,
                    checkpoints.created,
                    checkpoints.storage,
                    checkpoints.bookmarked,
                    checkpoints.project_id,
                    checkpoints.analytics,
                    checkpoints.retrain_geoms,
                    checkpoints.input_geoms,
                    ST_AsText(ST_Centroid(ST_Envelope(ST_Collect(geom)))) AS center,
                    ST_Extent(geom) AS bounds
                FROM
                    (SELECT id, ST_GeomFromGeoJSON(Unnest(retrain_geoms)) as geom FROM checkpoints WHERE id = ${checkpointid}) g,
                    checkpoints
                WHERE
                    checkpoints.id = ${checkpointid}
                AND checkpoints.archived = false
                GROUP BY
                    g.id,
                    checkpoints.id,
                    checkpoints.name,
                    checkpoints.parent,
                    checkpoints.classes,
                    checkpoints.created,
                    checkpoints.storage,
                    checkpoints.bookmarked,
                    checkpoints.project_id,
                    checkpoints.retrain_geoms,
                    checkpoints.input_geoms
            `);

        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to get checkpoint');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'Checkpoint not found');

        return CheckPoint.deserialize(pgres.rows[0]);
    }

    /**
     * Create a new Checkpoint
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Object} checkpoint - Checkpoint Object
     * @param {Number} checkpoint.project_id - Project the checkpoint belongs to
     * @param {String} checkpoint.name - Human readable name
     * @param {Number} checkpoint.parent - Parent Checkpoint ID
     * @param {Object[]} checkpoint.classes - Checkpoint Class names
     * @param {Object[]} checkpoint.geoms - GeoJSON MultiPoint Geometries
     * @param {Object} checkpoint.analytics - Checkpoint Analytics
     */
    static async generate(pool, checkpoint) {
        try {
            const pgres = await pool.query(sql`
                INSERT INTO checkpoints (
                    project_id,
                    parent,
                    name,
                    classes,
                    retrain_geoms,
                    input_geoms,
                    analytics
                ) VALUES (
                    ${checkpoint.project_id},
                    ${checkpoint.parent ? checkpoint.parent : null},
                    ${checkpoint.name},
                    ${JSON.stringify(checkpoint.classes)}::JSONB,
                    ${sql.array(checkpoint.retrain_geoms.map(e => JSON.stringify(e)), 'json')}::JSONB[],
                    ${sql.array(checkpoint.input_geoms.map(e => JSON.stringify(e)), 'json')}::JSONB[],
                    ${checkpoint.analytics ? JSON.stringify(checkpoint.analytics) : null}::JSONB
                ) RETURNING *
            `);

            return CheckPoint.deserialize(pgres.rows[0]);
        } catch (err) {
            if (err.originalError && err.originalError.code && err.originalError.code === '23503') throw new Err(400, err, 'Parent does not exist');
            throw new Err(500, err, 'Failed to create checkpoint');
        }
    }

    /**
     * Return a Mapbox Vector Tile of the checkpoint Geom
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Number} z - Z Tile Coordinate
     * @param {Number} x - X Tile Coordinate
     * @param {Number} y - Y Tile Coordinate
     */
    async mvt(pool, z, x, y) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    ST_AsMVT(q, 'data', 4096, 'geom', 'id') AS mvt
                FROM (
                    SELECT
                        id,
                        class,
                        ST_AsMVTGeom(geom, ST_TileEnvelope(${z}, ${x}, ${y}), 4096, 256, false) AS geom
                    FROM (
                        SELECT
                            id,
                            class,
                            geom
                        FROM (
                            SELECT
                                r.id,
                                t.class,
                                ST_Transform(ST_GeomFromGeoJSON(t.geom), 3857) AS geom
                            FROM (
                                WITH RECURSIVE parents (id, geom) AS (
                                    SELECT
                                        id,
                                        checkpoints.retrain_geoms AS geom
                                    FROM
                                        checkpoints
                                    WHERE
                                        id = ${this.id}
                                UNION ALL
                                    SELECT
                                        checkpoints.id,
                                        checkpoints.retrain_geoms AS geom
                                    FROM
                                        checkpoints
                                    JOIN
                                        parents ON checkpoints.parent = parents.id
                                )
                                SELECT
                                    id,
                                    geom
                                FROM
                                    parents
                            ) r, Unnest(r.geom) WITH ORDINALITY AS t (geom, class)
                        ) u
                    WHERE
                        ST_Intersects(geom, ST_TileEnvelope(${z}, ${x}, ${y}))
                ) n
                GROUP BY
                    id,
                    class,
                    geom
            ) q
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to create checkpoint MVT');
        }

        return pgres.rows[0].mvt;
    }
}

module.exports = CheckPoint;
