'use strict';

const Err = require('./error');
const jwt = require('jsonwebtoken');

class Auth {
    constructor(pool) {
        this.pool = pool;

        this.attrs = [
            'flags',
            'access'
        ];
    }

    async is_flag(req, flag) {
        await this.is_auth(req);

        if ((!req.auth.flags || !req.auth.flags[flag]) && req.auth.access !== 'admin') {
            throw new Err(401, null, `${flag} flag required`);
        }

        return true;
    }

    async is_admin(req) {
        if (!req.auth || !req.auth.access || req.auth.access !== 'admin') {
            throw new Err(401, null, 'Admin token required');
        }

        return true;
    }

    async patch(uid, patch) {
        const user = await this.user(uid);

        for (const attr of this.attrs) {
            if (patch[attr] !== undefined) {
                user[attr] = patch[attr];
            }
        }

        let pgres;
        try {
            pgres = await this.pool.query(`
                UPDATE users
                    SET
                        flags = $2,
                        access = $3

                    WHERE
                        id = $1
                    RETURNING *
            `, [
                uid,
                user.flags,
                user.access
            ]);
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        const row = pgres.rows[0];

        return {
            uid: parseInt(row.id),
            username: row.username,
            email: row.email,
            access: row.access,
            flags: row.flags
        };
    }

    /**
     * Return a list of users
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page of users to return
     * @param {String} [query.filter=] - Username or Email fragment to filter by
     */
    async list(query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;
        if (!query.filter) query.filter = '';

        let pgres;
        try {
            pgres = await this.pool.query(`
                SELECT
                    count(*) OVER() AS count,
                    id,
                    username,
                    access,
                    email,
                    flags
                FROM
                    users
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
                query.filter
            ]);
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            users: pgres.rows.map((row) => {
                return {
                    id: parseInt(row.id),
                    username: row.username,
                    email: row.email,
                    access: row.access,
                    flags: row.flags
                };
            })
        };
    }

    async user(uid) {
        let pgres;
        try {
            pgres = await this.pool.query(`
                SELECT
                    id,
                    username,
                    access,
                    email,
                    flags
                FROM
                    users
                WHERE
                    id = $1
            `, [
                uid
            ]);
        } catch (err) {
            throw new Err(500, err, 'Internal User Error');
        }

        if (pgres.rows.length === 0) {
            throw new Error(404, null, 'Failed to retrieve user');
        }

        return {
            uid: parseInt(pgres.rows[0].id),
            username: pgres.rows[0].username,
            email: pgres.rows[0].email,
            access: pgres.rows[0].access,
            flags: pgres.rows[0].flags
        };
    }

    async create(user) {
        if (!user.username) throw new Err(400, null, 'username required');
        if (!user.email) throw new Err(400, null, 'email required');
        if (!user.access) user.access = 'user';

        if (user.username === 'internal') throw new Err(400, null, '"internal" is not a valid username');

        let pgres;
        try {
            pgres = await this.pool.query(`
                    INSERT INTO users (
                        username,
                        email,
                        auth0_id,
                        access,
                        flags
                    ) VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        '{}'::JSONB
                    ) RETURNING *
                `, [
                user.username,
                user.email,
                user.auth0Id,
                user.access
            ]);
        } catch (err) {
            if (err && err.code === '23505') {
                throw new Err(400, err, 'Cannot create duplicate user');
            } else if (err) {
                throw new Err(500, err, 'Failed to create user');
            }
        }

        // return created user
        return {
            uid: parseInt(pgres.rows[0].id),
            username: pgres.rows[0].username,
            access: pgres.rows[0].access,
            email: pgres.rows[0].email,
            flags: pgres.rows[0].flags
        }
    }
}

class AuthToken {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;
    }

    async delete(auth, token_id) {
        if (!auth.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        }

        try {
            await this.pool.query(`
                DELETE FROM
                    users_tokens
                WHERE
                    uid = $1
                    AND id = $2
            `, [
                auth.uid,
                token_id
            ]);

            return {
                status: 200,
                message: 'Token Deleted'
            };

        } catch (err) {
            throw new Err(500, err, 'Failed to delete token');
        }
    }

    async validate(token) {
        let pgres, decoded;
        try {
            decoded = jwt.verify(token, this.config.SigningSecret);

            if (decoded.t === 'admin') {
                return {
                    uid: false,
                    username: false,
                    access: 'admin',
                    email: false
                };
            }

            pgres = await this.pool.query(`
                SELECT
                    users.id AS uid,
                    users.username,
                    users.access,
                    users.email,
                    users.flags
                FROM
                    users_tokens INNER JOIN users
                        ON users.id = users_tokens.uid
                WHERE
                    users_tokens.token = $1
            `, [
                token
            ]);
        } catch (err) {
            throw new Err(500, err, 'Failed to validate token');
        }

        if (!pgres.rows.length) {
            throw new Err(401, null, 'Invalid token');
        } else if (pgres.rows.length > 1) {
            throw new Err(401, null, 'Token collision');
        }

        // Token UID must equad DB UID
        if (decoded.u !== parseInt(pgres.rows[0].uid)) {
            throw new Err(401, null, 'Invalid token');
        } else if (decoded.t !== 'api') {
            throw new Err(401, null, 'Invalid token');
        }

        return {
            uid: parseInt(pgres.rows[0].uid),
            username: pgres.rows[0].username,
            access: pgres.rows[0].access,
            email: pgres.rows[0].email
        };
    }

    async list(auth) {
        if (!auth.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        }

        try {
            const pgres = await this.pool.query(`
                SELECT
                    id,
                    created,
                    name
                FROM
                    users_tokens
                WHERE
                    uid = $1
            `, [
                auth.uid
            ]);

            return pgres.rows.map((token) => {
                token.id = parseInt(token.id);

                return token;
            });
        } catch (err) {
            throw new Err(500, err, 'Failed to list tokens');
        }
    }

    async generate(auth, name) {
        if (auth.type !== 'auth0') {
            throw new Err(400, null, 'Only an Auth0 token can create a API token');
        } else if (!auth.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        } else if (!name || !name.trim()) {
            throw new Err(400, null, 'Token name required');
        }

        const token = jwt.sign({
            t: 'api',
            u: auth.uid
        }, this.config.SigningSecret);

        try {
            const pgres = await this.pool.query(`
                INSERT INTO users_tokens (
                    token,
                    created,
                    uid,
                    name
                ) VALUES (
                    $1,
                    NOW(),
                    $2,
                    $3
                ) RETURNING *
            `, [
                token,
                auth.uid,
                name
            ]);

            return {
                id: parseInt(pgres.rows[0].id),
                name: pgres.rows[0].name,
                token: 'api.' + pgres.rows[0].token,
                created: pgres.rows[0].created
            };
        } catch (err) {
            throw new Err(500, err, 'Failed to generate token');
        }
    }
}

module.exports = {
    Auth,
    AuthToken
};
