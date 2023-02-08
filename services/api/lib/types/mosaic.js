import Generic from '@openaddresses/batch-generic';
import Err from '@openaddresses/batch-error';
import { sql } from 'slonik';

/**
 * @class
 */
export default class Mosaic extends Generic {
    static _table = 'mosaics';

    static async list(pool, query = {}) {
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        if (!query.sourceid) query.sourceid = null;
        if (!query.sort) query.sort = 'created';
        if (!query.order || query.order === 'asc') {
            query.order = sql`asc`;
        } else {
            query.order = sql`desc`;
        }

        try {
            const pgres = await pool.query(sql`
                SELECT
                    count(*) OVER() AS count,
                    *
                FROM
                    mosaics
                WHERE
                    (${query.sourceid}::TEXT IS NULL OR source_id = ${query.sourceid})
                ORDER BY
                    ${sql.identifier(['mosaics', query.sort])} ${query.order}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page * query.limit}
            `);

            return this.deserialize_list(pgres);
        } catch (err) {
            throw new Err(500, err, 'Failed to list Mosaics');
        }
    }

}
