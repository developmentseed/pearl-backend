import Err from '@openaddresses/batch-error';
import Generic from '@openaddresses/batch-generic';
import { sql } from 'slonik';

/**
 * @class
 */
export default class Project extends Generic {
    static _table = 'projects';

    /**
     * Ensure a user can only access their own projects (or is an admin and can access anything)
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     */
    static async has_auth(pool, auth, projectid) {
        const proj = await Project.from(pool, projectid);

        if (auth.access !== 'admin' && auth.id !== proj.uid) {
            throw new Err(403, null, 'Cannot access a project you are not the owner of');
        }

        return proj;
    }

    /**
     * Return a list of projects
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Number} uid - Projects related to a specific user
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     * @param {String} [query.order=asc] Sort Order (asc/desc)
     */
    static async list(pool, uid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;
        if (query.name === undefined) query.name = null;

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
                    name,
                    model_id,
                    created
                FROM
                    projects
                WHERE
                    uid = ${uid}
                    AND archived = false
                    AND (${query.name}::TEXT IS NULL OR name ~* ${query.name})
                ORDER BY
                    created ${query.sort}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page * query.limit}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list projects');
        }

        return this.deserialize_list(pgres);
    }

    /**
     * Delete Project
     *
     * @param {Pool} pool Instantiated Postgres Pool
     */
    async delete() {
        try {
            await this._pool.query(sql`
                UPDATE projects
                    SET
                        archived = true
                    WHERE
                        id = ${this.id}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to archive Project');
        }

        return {};
    }
}
