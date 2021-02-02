'use strict';

const Err = require('./error');

class Aoi {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;
    }

    /**
     * Return a list of aois
     *
     * @param {Number} instanceid - AOIS related to a specific instance
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page of users to return
     * @param {Number} query.uid - Query by uid.
     */
    async list(instanceid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 1;

        const WHERE = [];

        if (query.status === 'active') {
            WHERE.push('active IS true');
        } else if (query.status === 'inactive') {
            WHERE.push('active IS false');
        }

        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    ST_AsGeoJSON(bounds)::JSON,
                    created
                FROM
                    aois
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
            throw new Err(500, new Error(err), 'Failed to list instances');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            instance_id: instanceid,
            aois: pgres.rows.map((row) => {
                return {
                    id: parseInt(row.id),
                    bounds: row.bounds,
                    created: row.created
                };
            })
        };
    }

    /**
     * Return a list of aois
     *
     * @param {Number} instanceid - AOIS related to a specific instance
     * @param {Object} aoi - AOI Object
     * @param {Object} aoi.bounds - AOI Bounds GeoJSON
     */
    async create(instanceid, aoi) {
        try {
            const pgres = await this.pool.query(`
                INSERT INTO aois (
                    instance_id,
                    bounds,
                    created
                ) VALUES (
                    $1,
                    ST_GeomFromGeoJSON($2),
                    NOW()
                ) RETURNING *
            `, [
                instanceid,
                aoi.bounds
            ]);

            return {
                id: parseInt(pgres.rows[0].id),
                instance_id: instanceid,
                created: pgres.rows[0].created,
                bounds: aoi.bounds
            };
        } catch (err) {
            throw new Err(500, err, 'Failed to create aoi');
        }
    }
}

module.exports = {
    Aoi
};
