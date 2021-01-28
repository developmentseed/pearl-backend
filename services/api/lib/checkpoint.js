'use strict';

const Err = require('./error');

class CheckPoint {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;
    }

    /**
     * Return a list of checkpoints for a given instance
     */
    async list(instance_id) {
        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    id,
                    instance_id,
                    created,
                    storage
                FROM
                    checkpoints
                WHERE
                    instance_id = $1
            `, [
                instance_id
            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list checkpoints');
        }

        return {
            total: pgres.rows.length,
            checkpoints: pgres.rows.map((row) => {
                id: parseInt(row.id),
                instance_id: parseInt(row.instance_id),
                created: row.created,
                storage: row.storage
            })
        };
    }
}

module.exports = {
    CheckPoint
};
