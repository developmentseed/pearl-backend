import Err from '@openaddresses/batch-error';
import Generic from '@openaddresses/batch-generic';
import Project from './project.js';
import { sql } from 'slonik';

/**
 * @class
 */
export default class Batch extends Generic {
    static _table = 'batch';

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Object} req Express Req Object
     */
    static async has_auth(pool, req) {

        const proj = await Project.has_auth(pool, req);
        const batch = await this.from(pool, req.params.batchid);

        if (batch.project_id !== proj.id) {
            throw new Err(400, null, `Batch #${req.params.batchid} is not associated with project #${req.params.projectid}`);
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
        if (query.completed === undefined) query.completed = null;

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
                    abort,
                    created,
                    updated,
                    error,
                    aoi,
                    name,
                    completed,
                    progress
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

        return this.deserialize_list(pgres);
    }
}
