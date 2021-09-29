const Err = require('./error');
const jwt = require('jsonwebtoken');
const { sql } = require('slonik');

/**
 * @class
 */
class Auth {
    constructor(config) {
        this.pool = config.pool;

        this.attrs = [
            'flags',
            'access'
        ];
    }

    async is_flag(req, flag) {
        await this.is_auth(req);

        if ((!req.auth.flags || !req.auth.flags[flag]) && req.auth.access !== 'admin') {
            throw new Err(403, null, `${flag} flag required`);
        }

        return true;
    }

    async is_admin(req) {
        if (!req.auth || !req.auth.access || req.auth.access !== 'admin') {
            throw new Err(403, null, 'Admin token required');
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
            pgres = await this.pool.query(sql`
                UPDATE users
                    SET
                        flags = ${user.flags},
                        access = ${user.access}

                    WHERE
                        id = ${uid}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal error');
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
            pgres = await this.pool.query(sql`
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
                    username iLIKE '%'||${query.filter}||'%'
                    OR email iLIKE '%'||${query.filter}||'%'
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page * query.limit}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal error');
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

    async user(uid, idField = 'id') {
        let pgres;
        try {
            pgres = await this.pool.query(sql`
                SELECT
                    id,
                    username,
                    access,
                    email,
                    flags
                FROM
                    users
                WHERE
                    ${sql.identifier(['users', idField])} = ${uid}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal Error');
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
            pgres = await this.pool.query(sql`
                INSERT INTO users (
                    username,
                    email,
                    auth0_id,
                    access,
                    flags
                ) VALUES (
                    ${user.username},
                    ${user.email},
                    ${user.auth0Id},
                    ${user.access},
                    '{}'::JSONB
                ) RETURNING *
            `);
        } catch (err) {
            if (err.originalError && err.originalError.code && err.originalError.code === '23505') {
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
        };
    }
}

class AuthToken {
    constructor(config) {
        this.pool = config.pool;
        this.config = config;
    }

    async delete(auth, token_id) {
        if (!auth.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        }

        try {
            await this.pool.query(sql`
                DELETE FROM
                    users_tokens
                WHERE
                    uid = ${auth.uid}
                    AND id = ${token_id}
            `);

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
        } catch (err) {
            throw new Err(401, err, 'Invalid Token');
        }

        try {
            if (decoded.t === 'admin') {
                return {
                    uid: false,
                    username: false,
                    access: 'admin',
                    email: false
                };
            }
            pgres = await this.pool.query(sql`
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
        if (decoded.u !== parseInt(pgres.rows[0].uid)) {
            throw new Err(401, null, 'Invalid Token');
        } else if (decoded.t !== 'api') {
            throw new Err(401, null, 'Invalid Token');
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
            throw new Err(401, null, 'Not Authenticated');
        }

        try {
            const pgres = await this.pool.query(sql`
                SELECT
                    id,
                    created,
                    name
                FROM
                    users_tokens
                WHERE
                    uid = ${auth.uid}
            `);

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
            const pgres = await this.pool.query(sql`
                INSERT INTO users_tokens (
                    token,
                    created,
                    uid,
                    name
                ) VALUES (
                    ${token},
                    NOW(),
                    ${auth.uid},
                    ${name}
                ) RETURNING *
            `);

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
