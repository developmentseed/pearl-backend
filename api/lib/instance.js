'use strict';

const Err = require('./error');
const jwt = require('jsonwebtoken');

class Instance {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;
    }

    async create(auth, model_id) {
        if (!auth.type) {
            throw new Err(400, null, 'Only an authenticated user can create a token');
        } else if (!auth.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        }

        const token = jwt.sign({
            data: {
                uid: auth.uid
            }
        }, this.config.InstanceSecret, { expiresIn: '6h' });

        try {
            const pgres = await this.pool.query(`
                INSERT INTO instances (
                    uid,
                    created,
                    model_id
                ) VALUES (
                    $1,
                    NOW(),
                    $2
                ) RETURNING *
            `, [
                auth.uid,
                model_id
            ]);

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
