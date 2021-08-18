'use strict';

const Err = require('./error');
const { sql } = require('slonik');

class Project {
    constructor(config) {
        this.pool = config.pool;
        this.config = config;
    }

    /**
     * Return a Row as a JSON Object
     * @param {Object} row Postgres Database Row
     *
     * @returns {Object}
     */
    static json(row) {
        return {
            id: parseInt(row.id),
            uid: parseInt(row.uid),
            name: row.name,
            model_id: parseInt(row.model_id),
            model_name: row.model_name,
            mosaic: row.mosaic,
            created: row.created
        };
    }

    /**
     * Ensure a user can only access their own projects (or is an admin and can access anything)
     *
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     */
    async has_auth(auth, projectid) {
        const proj = await this.get(projectid);

        if (auth.access !== 'admin' && auth.uid !== proj.uid) {
            throw new Err(401, null, 'Cannot access a project you are not the owner of');
        }

        return proj;
    }

    /**
     * Return a list of projects
     *
     * @param {Number} uid - Projects related to a specific user
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     */
    async list(uid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;
        if (!query.name) query.name = null;

        if (!query.sort || query.sort === 'desc') {
            query.sort = sql`desc`;
        } else {
            query.sort = sql`asc`;
        }

        let pgres;
        try {
            pgres = await this.pool.query(sql`
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
                    AND (${query.name}::TEXT IS NULL OR ${query.name} ~ ${query.name})
                ORDER BY
                    created ${query.sort}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list projects');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            projects: pgres.rows.map((row) => {
                return {
                    id: parseInt(row.id),
                    name: row.name,
                    created: row.created,
                    model_id: row.model_id
                };
            })
        };
    }

    /**
     * Create a new project
     *
     * @param {Number} uid - User ID that is creating project
     * @param {Object} project - Project Object
     * @param {Object} project.name - Project Name
     * @param {Object} project.model_id - Model ID
     * @param {Object} project.mosaic - Mosaic String
     */
    async create(uid, project) {
        try {
            const pgres = await this.pool.query(sql`
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

            return Project.json(pgres.rows[0]);
        } catch (err) {
            throw new Err(500, err, 'Failed to create project');
        }
    }

    /**
     * Get a specific project
     *
     * @param {Integer} projectid - Project Id to get
     */
    async get(projectid) {
        let pgres;
        try {
            pgres = await this.pool.query(sql`
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
                AND
                    p.model_id = m.id
                AND archived = false
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to get project');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No project found');

        return Project.json(pgres.rows[0]);
    }

    /**
     * Update Project Properties
     *
     * @param {Number} projectid - Specific Project id
     * @param {Object} project - Project Object
     * @param {String} project.name The name of the project
     */
    async patch(projectid, project) {
        let pgres;

        try {
            pgres = await this.pool.query(sql`
                UPDATE projects
                    SET
                        name = COALESCE(${project.name}, name)
                    WHERE
                        id = ${projectid}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update Project');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'Project not found');

        return Project.json(pgres.rows[0]);
    }

    /**
     * Delete Project
     *
     * @param {Number} projectid - Specific Project id
     */
    async delete(projectid) {
        try {
            await this.pool.query(sql`
                UPDATE projects
                    SET
                        archived = true
                    WHERE
                        id = ${projectid}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to archive Project');
        }

        return {};
    }
}

module.exports = {
    Project
};
