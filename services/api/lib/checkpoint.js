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
    async list(instanceid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    name,
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
                    name: row.name,
                    created: row.created,
                    storage: row.storage
                };
            })
        };
    }

    /**
     * Return a single checkpoint
     *
     * @param {Number} checkpointid Checkpoint ID to get
     */
    async get(checkpointid) {
        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    id,
                    name,
                    instance_id,
                    classes,
                    created,
                    storage
                FROM
                    checkpoints
                WHERE
                    id = $1
            `, [
                checkpointid
            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to get checkpoint');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'Checkpoint not found');
        const row = pgres.rows[0];

        return {
            id: parseInt(row.id),
            name: row.name,
            classes: row.classes,
            created: row.created,
            storage: row.storage
        };
    }


    /**
     * Create a new Checkpoint
     *
     * @param {Number} instanceid - Checkpoint related to a specific instance
     * @param {Object} checkpoint - Checkpoint Object
     */
    async create(instanceid, checkpoint) {
        if (!checkpoint) checkpoint = {};

        try {
            const pgres = await this.pool.query(`
                INSERT INTO checkpoints (
                    instance_id,
                    name,
                    classes
                ) VALUES (
                    $1,
                    $2,
                    $3::JSONB
                ) RETURNING *
            `, [
                instanceid,
                checkpoint.name,
                JSON.stringify(checkpoint.classes)
            ]);

            return {
                id: parseInt(pgres.rows[0].id),
                instance_id: instanceid,
                created: pgres.rows[0].created,
                name: pgres.rows[0].name,
                classes: pgres.rows[0].classes,
                storage: pgres.rows[0].storage
            };
        } catch (err) {
            throw new Err(500, err, 'Failed to create checkpoint');
        }
    }
}

module.exports = {
    CheckPoint
};
