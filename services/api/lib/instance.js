'use strict';

const Err = require('./error');
const jwt = require('jsonwebtoken');

class Instance {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;
    }

    /**
     * Return a list of instances
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page of users to return
     * @param {Number} [query.status=active] - Should the session be active? `active`, `inactive`, or `all`
     * @param {Number} query.uid - Query by uid.
     */
    async list(query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 1;
        if (!query.status) query.status = 'active';

        let WHERE = [];

        if (query.status === 'active') {
            WHERE.push('active IS true');
        } else if (query.status === 'inactive') {
            WHERE.push('active IS false');
        }

        if (query.uid) {
            WHERE.push('uid = ', parseInt(query.uid));
        }

        if (WHERE.length) WHERE = 'WHERE ' + WHERE.join(' AND ');

        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    uid,
                    active,
                    created,
                    model_id
                FROM
                    instances
                ${WHERE}
                LIMIT
                    $1
                OFFSET
                    $2
            `, [
                query.limit,
                query.page

            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list instances');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            instances: pgres.rows.map((row) => {
                return {
                    id: parseInt(row.id),
                    uid: parseInt(row.uid),
                    active: row.active,
                    created: row.created,
                    model_id: parseInt(row.model_id)
                };
            })
        };
    }

    async patch(body) {

    }

    async create(auth, model_id) {
        if (!auth.type) {
            throw new Err(400, null, 'Only an authenticated user can create a token');
        } else if (!auth.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        }

        try {
            const pgres = await this.pool.query(`
                INSERT INTO instances (
                    uid,
                    created,
                    model_id,
                    active
                ) VALUES (
                    $1,
                    NOW(),
                    $2,
                    False
                ) RETURNING *
            `, [
                auth.uid,
                model_id
            ]);

            const token = jwt.sign({
                t: 'inst',
                u: auth.uid,
                m: parseInt(pgres.rows[0].id)
            }, this.config.SigningSecret, { expiresIn: '12h' });

            return {
                id: parseInt(pgres.rows[0].id),
                created: pgres.rows[0].created,
                model_id: parseInt(pgres.rows[0].model_id),
                token: token
            };
        } catch (err) {
            throw new Err(500, err, 'Failed to generate token');
        }
    }

    /**
     * Retrieve information about an instance
     */
    async get(id) {
        let pgres;

        try {
            pgres = await this.pool.query(`
                SELECT
                    id,
                    uid,
                    created,
                    model_id,
                    active
                FROM
                    instances
                WHERE
                    id = $1
            `, [id]);
        } catch (err) {
            throw new Err(500, err, 'Internal Instance Error');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No instance found');

        return {
            id: parseInt(gres.rows[0].id),
            uid: parseInt(gres.rows[0].uid),
            created: pgres.rows[0].created,
            model_id: parseInt(pgres.rows[0].model_id),
            active: pgres.rows[0].id
        };
    }
}

module.exports = {
    Instance
};
