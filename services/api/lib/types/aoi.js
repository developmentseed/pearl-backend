import Err from '@openaddresses/batch-error';
import Generic, { Params } from '@openaddresses/batch-generic';
import Project from './project.js';
import { sql } from 'slonik';

/**
 * @class
 */
export default class AOI extends Generic {
    static _table = 'aois';

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
     * @param {String} [query.sort] - Sort AOI list by ascending or descending order of the created timestamp. Allowed asc or desc. Default desc.
     */
    static async list(pool, projectid, query = {}) {
        query.limit = Params.integer(query.limit, { default: 100 });
        query.page = Params.integer(query.page, { default: 0 });

        if (!query.sort || query.sort === 'desc') {
            query.sort = sql`desc`;
        } else {
            query.sort = sql`asc`;
        }

        if (query.bookmarked === undefined) query.bookmarked = null;

        let pgres;
        try {
            pgres = await pool.query(sql`
               SELECT
                    count(*) OVER() AS count,
                    a.id                                AS id,
                    a.name                              AS name,
                    a.bounds                            AS bounds,
                    Round(ST_Area(a.bounds::GEOGRAPHY)) AS area,
                    a.created                           AS created,
                    a.updated                           AS updated
                FROM
                    aois a
                WHERE
                    a.project_id = ${projectid}
                    AND a.archived = false
                    AND (${query.bookmarked}::BOOLEAN IS NULL OR a.bookmarked = ${query.bookmarked})
                ORDER BY
                    a.created ${query.sort}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page * query.limit}
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to list AOIs');
        }

        const list = this.deserialize_list(pgres);
        list.project_id = projectid;

        return list;
    }

    serialize() {
        const json = super.serialize();
        json.area = this.area;
        return json;
    }

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Object} req Express req object
     */
    static async has_auth(pool, req) {
        const proj = await Project.has_auth(pool, req);
        const aoi = await AOI.from(pool, req.params.aoiid);

        if (aoi.project_id !== proj.id) {
            throw new Err(400, null, `AOI #${req.params.aoiid} is not associated with project #${req.params.projectid}`);
        }

        return aoi;
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
                    a.*,
                    Round(ST_Area(a.bounds::GEOGRAPHY)) AS area
                FROM
                    aois a
                WHERE
                    a.id = ${id}
                AND
                    a.archived = false
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to get AOI');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'aoi not found');

        return this.deserialize(pool, pgres);
    }
}
