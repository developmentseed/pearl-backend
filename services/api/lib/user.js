const { Err } = require('@openaddresses/batch-schema');
const { sql } = require('slonik');
const Generic = require('./generic');

/**
 * @class
 */
class User extends Generic {
    static _table = 'users';
    static _patch = require('../schema/req.body.PatchUser.json');
    static _res = require('../schema/res.User.json');

    static async is_admin(req) {
        if (!req.auth || !req.auth.access || req.auth.access !== 'admin') {
            throw new Err(403, null, 'Admin token required');
        }

        return true;
    }

    /**
     * Return a list of users
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page of users to return
     * @param {String} [query.filter=] - Username or Email fragment to filter by
     * @param {String} [query.sort=created] Field to sort by
     * @param {String} [query.order=asc] Sort Order (asc/desc)
     */
    static async list(pool, query = {}) {
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;
        if (!query.filter) query.filter = '';

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
                    id,
                    created,
                    updated,
                    username,
                    access,
                    email
                FROM
                    users
                WHERE
                    username iLIKE '%'||${query.filter}||'%'
                    OR email iLIKE '%'||${query.filter}||'%'
                ORDER BY
                    ${sql.identifier(['users', query.sort])} ${query.order}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page * query.limit}
            `);

            return this.deserialize(pgres.rows);
        } catch (err) {
            throw new Err(500, err, 'Internal error');
        }
    }

    async commit(pool) {
        try {
            await pool.query(sql`
                UPDATE users
                    SET
                        access = ${this.access},
                        updated = NOW()
                    WHERE
                        id = ${this.id}
            `);

            return this;
        } catch (err) {
            throw new Err(500, err, 'Failed to update user');
        }
    }

    static async from(pool, uid, idField = 'id') {
        try {
            const pgres = await pool.query(sql`
                SELECT
                    id,
                    username,
                    access,
                    email
                FROM
                    users
                WHERE
                    ${sql.identifier(['users', idField])} = ${uid}
            `);

            if (!pgres.rows.length) {
                throw new Err(404, null, 'User not found');
            }

            return this.deserialize(pgres.rows[0]);
        } catch (err) {
            throw new Err(500, err, 'Internal Error');
        }
    }

    static async generate(pool, user) {
        if (!user.username) throw new Err(400, null, 'username required');
        if (!user.email) throw new Err(400, null, 'email required');
        if (!user.access) user.access = 'user';

        if (user.username === 'internal') throw new Err(400, null, '"internal" is not a valid username');

        try {
            const pgres = await pool.query(sql`
                INSERT INTO users (
                    username,
                    email,
                    auth0_id,
                    access
                ) VALUES (
                    ${user.username},
                    ${user.email},
                    ${user.auth0Id},
                    ${user.access}
                ) RETURNING *
            `);

            return this.deserialize(pgres.rows[0]);
        } catch (err) {
            if (err.originalError && err.originalError.code && err.originalError.code === '23505') {
                throw new Err(400, err, 'Cannot create duplicate user');
            } else if (err) {
                throw new Err(500, err, 'Failed to create user');
            }
        }
    }
}

module.exports = User;
