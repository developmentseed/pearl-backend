'use strict';
const { Err } = require('@openaddresses/batch-schema');
const Generic = require('@openaddresses/batch-generic');
const jwt = require('jsonwebtoken');
const { sql } = require('slonik');

/**
 * @class
 */
class Token extends Generic {
    static _table = 'users_tokens';
    static _patch = false;
    static _res = require('../schema/res.Token.json');

    static async list(pool, uid, query = {}) {
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
                    id,
                    created,
                    name
                FROM
                    users_tokens
                WHERE
                    uid = ${uid}
                ORDER BY
                    ${sql.identifier(['users_tokens', query.sort])} ${query.order}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page * query.limit}
            `);

            return this.deserialize(pgres.rows, 'tokens');
        } catch (err) {
            throw new Err(500, err, 'Failed to list tokens');
        }
    }

    async delete(pool) {
        try {
            await pool.query(sql`
                DELETE FROM
                    users_tokens
                WHERE
                    uid = ${this.uid}
                    AND id = ${this.id}
            `);

            return true;
        } catch (err) {
            throw new Err(500, err, 'Failed to delete token');
        }
    }

    static async validate(config, token) {
        let pgres, decoded;
        try {
            decoded = jwt.verify(token, config.SigningSecret);
        } catch (err) {
            throw new Err(401, err, 'Invalid Token');
        }

        try {
            if (decoded.t === 'admin') {
                return {
                    id: false,
                    username: false,
                    access: 'admin',
                    email: false
                };
            }
            pgres = await config.pool.query(sql`
                SELECT
                    users.id AS id,
                    users.username,
                    users.access,
                    users.email,
                    users.created,
                    users.updated,
                    users.flags
                FROM
                    users_tokens INNER JOIN users
                        ON users.id = users_tokens.uid
                WHERE
                    users_tokens.token = ${token}
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to validate token');
        }

        if (!pgres.rows.length) {
            throw new Err(401, null, 'Invalid Token');
        } else if (pgres.rows.length > 1) {
            throw new Err(401, null, 'Token Collision');
        }

        // Token UID must equad DB UID
        if (decoded.u !== parseInt(pgres.rows[0].id)) {
            throw new Err(401, null, 'Invalid Token');
        } else if (decoded.t !== 'api') {
            throw new Err(401, null, 'Invalid Token');
        }

        return {
            id: pgres.rows[0].id,
            username: pgres.rows[0].username,
            access: pgres.rows[0].access,
            email: pgres.rows[0].email,
            created: pgres.rows[0].created,
            updated: pgres.rows[0].updated,
            flags: pgres.rows[0].flags
        };
    }

    static async generate(pool, opts, secret) {
        const token = jwt.sign({
            t: 'api',
            u: opts.uid
        }, secret);

        try {
            const pgres = await pool.query(sql`
                INSERT INTO users_tokens (
                    token,
                    created,
                    uid,
                    name
                ) VALUES (
                    ${token},
                    NOW(),
                    ${opts.uid},
                    ${opts.name}
                ) RETURNING
                    id,
                    'api.'||token AS token,
                    created,
                    uid,
                    name
            `);

            return this.deserialize(pgres.rows[0]);
        } catch (err) {
            throw new Err(500, err, 'Failed to generate token');
        }
    }
}

module.exports = Token;
