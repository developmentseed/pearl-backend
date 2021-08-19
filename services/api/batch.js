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

        this.id = false;
        this.uid = false;
        this.created = false;
        this.updated = false;
        this.name = false;
        this.bounds = false;
        this.completed = false;

        // Attributes which are allowed to be patched
        this.attrs = Object.keys(require('../schema/req.body.PatchBatch.json').properties);
    }

    /**
     * Return a list of batches
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Number} uid - User ID to filter by
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     * @param {boolean} [query.completed] - Filter by completion
     * @param {String} [query.sort=created] Field to sort by
     * @param {String} [query.order=asc] Sort Order (asc/desc)
     */
    static async list(pool, uid, query) {
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
                    uid,
                    created,
                    updated,
                    name,
                    completed
                FROM
                    batch
                WHERE
                    uid = ${uid}
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
            id: parseInt(this.id),
            created: this.created,
            updated: this.updated,
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
                    name,
                    bounds
                ) VALUES (
                    ${batch.uid},
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
