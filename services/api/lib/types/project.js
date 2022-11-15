import Err from '@openaddresses/batch-error';
import Generic from '@openaddresses/batch-generic';
import { sql } from 'slonik';

/**
 * @class
 */
export default class Project extends Generic {
    static _table = 'projects';
    static _patch = require('../schema/req.body.PatchProject.json');
    static _res = require('../schema/res.Project.json');

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

        return this.deserialize(pgres.rows);
    }

    /**
     * Create a new project
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Number} uid - User ID that is creating project
     * @param {Object} project - Project Object
     * @param {Object} project.name - Project Name
     * @param {Object} project.model_id - Model ID
     * @param {Object} project.mosaic - Mosaic String
     */
    static async generate(pool, uid, project) {
        try {
            const pgres = await pool.query(sql`
                INSERT INTO projects (
                    uid,
                    name,
                    model_id,
                    mosaic
                ) VALUES (
                    ${uid},
                    ${project.name},
                    ${project.model_id},
                    ${project.mosaic}
                ) RETURNING *
            `);

            return this.deserialize(pgres.rows[0]);
        } catch (err) {
            throw new Err(500, err, 'Failed to generate project');
        }
    }

    /**
     * Get a specific project
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Integer} projectid - Project Id to get
     */
    static async from(pool, projectid) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                SELECT
                    p.id AS id,
                    p.uid AS uid,
                    p.name AS name,
                    p.model_id AS model_id,
                    p.mosaic AS mosaic,
                    p.created AS created,
                    m.name AS model_name
                FROM
                    projects p,
                    models m
                WHERE
                    p.id = ${projectid}
                    AND p.model_id = m.id
                    AND archived = false
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to get project');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No project found');

        return this.deserialize(pgres.rows[0]);
    }

    /**
     * Update Project Properties
     *
     * @param {Pool} pool Instantiated Postgres Pool
     */
    async commit(pool) {
        try {
            await pool.query(sql`
                UPDATE projects
                    SET
                        name = ${this.name}
                    WHERE
                        id = ${this.id}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to commit Project');
        }

        return this;
    }

    /**
     * Delete Project
     *
     * @param {Pool} pool Instantiated Postgres Pool
     */
    async delete(pool) {
        try {
            await pool.query(sql`
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
