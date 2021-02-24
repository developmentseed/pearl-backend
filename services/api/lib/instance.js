'use strict';

const Err = require('./error');
const jwt = require('jsonwebtoken');
const { Kube } = require('./kube');
const kube = new Kube('default');
class Instance {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;
    }

    /**
     * Return a Row as a JSON Object
     * @param {Object} row Postgres Database Row
     */
    static json(row) {
        return {
            id: parseInt(row.id),
            project_id: parseInt(row.project_id),
            created: row.created,
            active: row.active
        };
    }


    /**
     * Return a list of instances
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page of users to return
     * @param {Number} [query.status=active] - Should the session be active? `active`, `inactive`, or `all`
     */
    async list(query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;
        if (!query.status) query.status = 'active';

        let WHERE = [];

        if (query.status === 'active') {
            WHERE.push('active IS true');
        } else if (query.status === 'inactive') {
            WHERE.push('active IS false');
        }

        if (WHERE.length) WHERE = 'WHERE ' + WHERE.join(' AND ');

        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    active,
                    created
                FROM
                    instances
                ${WHERE}
                LIMIT
                    $1
                OFFSET
                    $2
            `, [
                query.limit,
                query.page

            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list instances');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            instances: pgres.rows.map((row) => {
                return {
                    id: parseInt(row.id),
                    active: row.active,
                    created: row.created
                };
            })
        };
    }

    async patch() {

    }

    async create(auth, instance) {
        if (!auth.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        }

        try {
            const pgres = await this.pool.query(`
                INSERT INTO instances (
                    project_id
                ) VALUES (
                    $1
                ) RETURNING *
            `, [
                instance.project_id
            ]);

            const token = jwt.sign({
                t: 'inst',
                u: auth.uid,
                i: parseInt(pgres.rows[0].id)
            }, this.config.SigningSecret, { expiresIn: '12h' });

            const instanceId = parseInt(pgres.rows[0].id)
            const podSpec = kube.makePodSpec(instanceId, [
                {
                    name: 'INSTANCE_ID',
                    value: instanceId.toString()
                },
                {
                    name: 'API',
                    value: 'https://api.lulc.ds.io'
                },
                {
                    name: 'SOCKET',
                    value: 'ws://socket.lulc.ds.io'
                },
                {
                    name: 'SigningSecret',
                    value: this.config.SigningSecret
                }
            ]);
            console.log('podSpec', JSON.stringify(podSpec));
            const pod = await kube.createPod(podSpec);

            return {
                id: parseInt(pgres.rows[0].id),
                created: pgres.rows[0].created,
                model_id: parseInt(pgres.rows[0].model_id),
                token: token,
                mosaic: pgres.rows[0].mosaic,
                pod: pod
            };
        } catch (err) {
            throw new Err(500, err, 'Failed to generate token');
        }
    }

    /**
     * Retrieve information about an instance
     *
     * @param {Number} instanceid Instance ID to get
     */
    async get(instanceid) {
        let pgres;

        try {
            pgres = await this.pool.query(`
                SELECT
                    id,
                    created,
                    project_id,
                    active
                FROM
                    instances
                WHERE
                    id = $1
            `, [instanceid]);
        } catch (err) {
            throw new Err(500, err, 'Internal Instance Error');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No instance found');

        return Instance.json(pgres.rows[0]);
    }
}

module.exports = {
    Instance
};
