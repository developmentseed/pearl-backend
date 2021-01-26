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
                WHERE
                    username iLIKE '%'||$3||'%'
                    OR email iLIKE '%'||$3||'%'
                LIMIT
                    $1
                OFFSET
                    $2
            `, [
                query.limit,
                query.page,

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
}

module.exports = {
    Instance
};
