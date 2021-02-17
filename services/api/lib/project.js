'use strict';

const Err = require('./error');

class Project {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;
    }

    /**
     * Return a list of projects
     *
     * @param {Number} instanceid - AOIS related to a specific instance
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     */
    async list(uid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    name,
                    created
                FROM
                    projects
                WHERE
                    uid = $3
                LIMIT
                    $1
                OFFSET
                    $2
            `, [
                query.limit,
                query.page,
                uid
            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list projects');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            projects: pgres.rows.map((row) => {
                return {
                    id: parseInt(row.id),
                    name: row.name,
                    created: row.created
                };
            })
        };
    }

    /**
     * Create a new project
     *
     * @param {Object} project - Project Object
     * @param {Object} project.name - Project Name
     * @param {Object} project.model_id - Model ID
     * @param {Object} project.mosaic - Mosaic String
     */
    async create(uid, project) {
        try {
            const pgres = await this.pool.query(`
                INSERT INTO projects (
                    uid,
                    name,
                    model_id,
                    mosaic
                ) VALUES (
                    $1,
                    $2,
                    $3,
                    $4
                ) RETURNING *
            `, [
                uid,
                project.name,
                project.model_id,
                project.mosaic
            ]);

            return {
                id: parseInt(pgres.rows[0].id),
                name: pgres.rows[0].name,
                model_id: parseInt(pgres.rows[0].model_id),
                mosaic: pgres.rows[0].mosaic,
                created: pgres.rows[0].created
            };
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
            pgres = await this.pool.query(`
                SELECT
                    id,
                    uid,
                    name,
                    model_id,
                    mosaic,
                    created
                FROM
                    projects
                WHERE
                    id = $1
            `, [
                projectid
            ]);
        } catch (err) {
            throw new Err(500, err, 'Failed to get project');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No project found');

        return {
            id: parseInt(pgres.rows[0].id),
            uid: parseInt(pgres.rows[0].uid),
            name: pgres.rows[0].name,
            model_id: parseInt(pgres.rows[0].model_id),
            mosaic: pgres.rows[0].mosaic,
            created: pgres.rows[0].created
        };
    }
}

module.exports = {
    Project
};
