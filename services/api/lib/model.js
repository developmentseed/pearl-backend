'use strict';

const Err = require('./error');

class Model {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * Create a new model
     */
    async create() {
        let pgres;

        try {
            pgres = await this.pool.query(`
                INSERT INTO models (
                    created,
                    active
                ) VALUES (
                    NOW(),
                    true
                ) RETURNING *
            `, []);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        return {
            id: parseInt(pgres.rows[0].id),
            created: pgres.rows[0].created
        };
    }

    /**
     * Retrieve information about a model
     */
    async get(id) {
        let pgres;

        try {
            pgres = await this.pool.query(`
                SELECT
                    id,
                    created,
                    active
                FROM
                    models
                WHERE
                    id = $1
            `, [id]);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No model found');

        return {
            id: parseInt(pgres.rows[0].id),
            created: pgres.rows[0].created,
            active: pgres.rows[0].active
        };
    }

    /**
     * Set a model as inactive and unusable
     */
    async delete(id) {
        try {
            await this.pool.query(`
                UPDATE
                    model
                SET
                    active = false
                WHERE
                    id = $1
                RETURNING *
            `, [id]);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No model found');

        return {
            id: parseInt(pgres.rows[0].id),
            created: pgres.rows[0].created,
            active: pgres.rows[0].active
        };
    }
}

module.exports = {
    Model
};
