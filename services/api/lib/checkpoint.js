'use strict';

const Err = require('./error');

class CheckPoint {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;
    }

    /**
     * Return a list of checkpoints for a given instance
     *
     * @param {Number} instanceid Instance ID to list checkpoints for
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of checkpoints to return
     * @param {Number} [query.page=0] - Page to return
     */
    async list(instanceid) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 1;

        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    instance_id,
                    created,
                    storage
                FROM
                    checkpoints
                WHERE
                    instance_id = $3
                LIMIT
                    $1
                OFFSET
                    $2
            `, [
                query.limit,
                query.page,
                instanceid
            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list checkpoints');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            instance_id: instanceid,
            checkpoints: pgres.rows.map((row) => {
                return {
                    id: parseInt(row.id),
                    created: row.created,
                    storage: row.storage
                };
            })
        };
    }
}

module.exports = {
    CheckPoint
};
