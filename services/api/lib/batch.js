'use strict';

const Err = require('./error');
const Generic = require('./generic');
const { sql } = require('slonik');

/**
 * @class
 */
class Batch extends Generic {
    static _table = 'batch';

    constructor() {
        super();

        this._table = Batch._table;

        // Attributes which are allowed to be patched
        this.attrs = Object.keys(require('../schema/req.body.PatchBatch.json').properties);
    }

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Project} project Instantiated Project class
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} checkpointid Checkpoint the user is attemping to access
     */
    static async has_auth(project, auth, projectid, batchid) {
        const proj = await project.has_auth(auth, projectid);
        const checkpoint = await this.get(checkpointid);

        if (checkpoint.project_id !== proj.id) {
            throw new Err(400, null, `Checkpoint #${checkpointid} is not associated with project #${projectid}`);
        }

        return batch;
    }

    /**
     * Return a list of batches
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     *
     * @param {Object} query - Query Object
     * @param {Number} query.uid - User ID
     * @param {Number} query.projectid - Project ID
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     * @param {boolean} [query.completed] - Filter by completion
     * @param {String} [query.sort=created] Field to sort by
     * @param {String} [query.order=asc] Sort Order (asc/desc)
     */
    static async list(pool, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;
        if (!query.completed) query.completed = null;

        if (!query.sort) query.sort = 'created';
        if (!query.order || query.order === 'asc') {
            query.order = sql`asc`;
        } else {
            query.order = sql`desc`;
        }

        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    count(*) OVER() AS count,
                    id,
                    created,
                    updated,
                    aoi,
                    name,
                    completed
                FROM
                    batch
                WHERE
                    uid = ${query.uid}
                    AND project_id = ${query.projectid}
                    AND (${query.completed}::BOOLEAN IS NULL OR ${query.completed} = completed)
                ORDER BY
                    ${sql.identifier(['batch', query.sort])} ${query.order}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.limit * query.page}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal Batch Error');
        }

        return this.deserialize(pgres.rows);
    }

    serialize() {
        return {
            id: this.id,
            uid: this.uid,
            project_id: this.project_id,
            created: this.created,
            updated: this.updated,
            aoi: this.aoi,
            name: this.name,
            bounds: this.bounds,
            completed: this.completed
        };
    }

    async commit(pool) {
        try {
            await pool.query(sql`
                UPDATE batch
                    SET
                        aoi         = ${this.aoi},
                        completed   = ${this.completed},
                        updated     = NOW()
                    WHERE
                        id = ${this.id}
            `);

            return this;
        } catch (err) {
            throw new Err(500, err, 'Failed to save Batch');
        }
    }

    static async generate(pool, batch) {
        try {
            const pgres = await pool.query(sql`
                INSERT INTO batch (
                    uid,
                    project_id,
                    name,
                    bounds
                ) VALUES (
                    ${batch.uid},
                    ${batch.project_id},
                    ${batch.name},
                    ${batch.bounds}
                ) RETURNING *
            `);

            return Batch.deserialize(pgres.rows[0]);
        } catch (err) {
            throw new Err(500, err, 'Failed to generate Batch');
        }
    }
}

module.exports = Batch;
