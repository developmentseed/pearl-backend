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
                    created
                ) VALUES (
                    NOW()
                ) RETURNING *
            `, []);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        return {
            id: pgres.rows[0].id,
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
                    created
                FROM
                    models
                WHERE
                    id = $1
            `, [id]);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        if (!pgres.rows.length) throw new Erro(404, null, 'No model found');

        return {
            id: pgres.rows[0].id,
            created: pgres.rows[0].created
        };
    }
}

module.exports = {
    Model
};
