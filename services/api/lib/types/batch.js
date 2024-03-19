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
                    batch.*,
                    Row_To_JSON(mosaics.*) AS mosaic,
                    Row_To_JSON(aois.*) AS aoi,
                    Row_To_JSON(tf.*) AS timeframe
                FROM
                    batch
                        LEFT JOIN aoi_timeframe tf
                            ON batch.timeframe = tf.id
                        LEFT JOIN aois
                            ON batch.aoi = aois.id
                        LEFT JOIN mosaics
                            ON batch.mosaic = mosaics.name
                                OR batch.mosaic = mosaics.id
                WHERE
                    uid = ${query.uid}
                    AND batch.project_id = ${query.projectid}
                    AND (${query.completed}::BOOLEAN IS NULL OR ${query.completed} = batch.completed)
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

    /**
     * Return a single Batch
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Number} id - Specific Batch id
     */
    static async from(pool, id) {
        let pgres;
        try {
            pgres = await pool.query(sql`
               SELECT
                    batch.*,
                    Row_To_JSON(mosaics.*) AS mosaic,
                    Row_To_JSON(aois.*) AS aoi,
                    Row_To_JSON(tf.*) AS timeframe
                FROM
                    batch
                        LEFT JOIN aoi_timeframe tf
                            ON batch.timeframe = tf.id
                        LEFT JOIN aois
                            ON batch.aoi = aois.id
                        LEFT JOIN mosaics
                            ON batch.mosaic = mosaics.name
                                OR batch.mosaic = mosaics.id
                WHERE
                    batch.id = ${id}
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to get Batch');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'Batch not found');

        return this.deserialize(pool, pgres);
    }
}
