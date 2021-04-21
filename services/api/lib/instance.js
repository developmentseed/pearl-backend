'use strict';

const Err = require('./error');
const jwt = require('jsonwebtoken');
const { Kube } = require('./kube');

/**
 * @class
 */
class Instance {
    /**
     * @param {Config} config Server Config
     */
    constructor(config) {
        this.pool = config.pool;
        this.config = config;

        this.kube = new Kube(config, 'default');
    }

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Project} project Instantiated Project class
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} instanceid Instance the user is attemping to access
     */
    async has_auth(project, auth, projectid, instanceid) {
        const proj = await project.has_auth(auth, projectid);
        const instance = await this.get(auth, instanceid);

        if (instance.project_id !== proj.id) {
            throw new Err(400, null, `Instance #${instanceid} is not associated with project #${projectid}`);
        }

        return instance;
    }

    /**
     * Return a Row as a JSON Object
     *
     * @param {Object} row Postgres Database Row
     *
     * @returns {Object}
     */
    static json(row) {
        const inst = {
            id: parseInt(row.id),
            project_id: parseInt(row.project_id),
            aoi_id: parseInt(row.aoi_id),
            checkpoint_id: parseInt(row.checkpoint_id),
            last_update: row.last_update,
            created: row.created,
            active: row.active,
            type: row.type
        };

        if (row.token) inst.token = row.token;

        return inst;
    }

    /**
     * Return a list of instances
     *
     * @param {Number} projectid - Project ID
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page of users to return
     * @param {Number} [query.status=active] - Should the session be active? `active`, `inactive`, or `all`
     * @param {Number} [query.type] - Filter by type of instance. `gpu` or 'cpu'. Default all.
     */
    async list(projectid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        const where = [];
        where.push(`project_id = ${projectid}`);

        if (query.type) {
            where.push(`type='${query.type}'`);
        }

        if (query.status === 'active') {
            where.push('active IS true');
        } else if (query.status === 'inactive') {
            where.push('active IS false');
        }

        let pgres;
        try {
            pgres = await this.pool.query(`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    active,
                    created,
                    type
                FROM
                    instances
                WHERE
                    ${where.join(' AND ')}
                ORDER BY
                    last_update
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
                    created: row.created,
                    type: row.type
                };
            })
        };
    }

    /**
     * Generate an Instance Token for authenticated with a websocket
     *
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} instanceid Instance ID to get
     *
     * @returns {String} Auth Token
     */
    token(auth, projectid, instanceid) {
        return jwt.sign({
            t: 'inst',
            u: auth.uid,
            p: parseInt(projectid),
            i: parseInt(instanceid)
        }, this.config.SigningSecret, { expiresIn: '12h' });
    }

    async activeGpuInstances() {
        try {
            const pgres = await this.pool.query(`
                SELECT count(*) OVER() AS count
                FROM instances
                WHERE
                    type='gpu'
                AND
                    active IS true
            `);

            if (pgres.rows.length) {
                return pgres.rows[0].count;
            } else {
                return 0;
            }

        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to check active GPUs');
        }
    }

    /**
     * Create a new GPU instance
     *
     * @param {Object} auth - Express Request Auth object
     * @param {Object} instance - Instance Object
     * @param {Number} instance.aoi_id The current AOI loaded on the instance
     * @param {Number} instance.checkpoint_id The current checkpoint loaded on the instance
     */
    async create(auth, instance) {
        if (!auth.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        }

        // const activeGpuInstanceCount = await this.activeGpuInstances();
        const podList = await this.kube.listPods();
        const type = podList.length < this.config.GpuCount ? 'gpu' : 'cpu';

        try {
            const pgres = await this.pool.query(`
                INSERT INTO instances (
                    project_id,
                    aoi_id,
                    checkpoint_id,
                    type
                ) VALUES (
                    $1, $2, $3, $4
                ) RETURNING *
            `, [
                instance.project_id,
                instance.aoi_id,
                instance.checkpoint_id,
                type
            ]);

            const instanceId = parseInt(pgres.rows[0].id);

            let pod = {};
            if (this.config.Environment !== 'local') {
                const podSpec = this.kube.makePodSpec(instanceId, type, [{
                    name: 'INSTANCE_ID',
                    value: instanceId.toString()
                },{
                    name: 'API',
                    value: this.config.ApiUrl
                },{
                    name: 'SOCKET',
                    value: this.config.SocketUrl
                },{
                    name: 'SigningSecret',
                    value: this.config.SigningSecret
                },{
                    name: 'NVIDIA_DRIVER_CAPABILITIES',
                    value: 'compute,utility'
                },{
                    name: 'TileUrl',
                    value: this.config.TileUrl
                }]);

                pod = await this.kube.createPod(podSpec);
            }

            const inst = Instance.json(pgres.rows[0]);
            inst.token = this.token(auth, pgres.rows[0].project_id, pgres.rows[0].id);
            inst.pod = pod;

            return inst;
        } catch (err) {
            throw new Err(500, err, 'Failed to generate token');
        }
    }

    /**
     * Remove an instance from the database
     *
     * Note: Does not check for active state - the caller should ensure the instance is not active
     *
     * @param {Number} instanceid Instance ID to delete
     */
    async delete(instanceid) {
        try {
            await this.pool.query(`
                DELETE
                    FROM
                        instances
                    WHERE
                        id = $1
            `, [instanceid]);
        } catch (err) {
            throw new Err(500, err, 'Internal Instance Delete Error');
        }
        return true;
    }

    /**
     * Retrieve information about an instance
     *
     * @param {Object} auth - Express Request Auth object
     * @param {Number} instanceid Instance ID to get
     */
    async get(auth, instanceid) {
        let pgres;

        try {
            pgres = await this.pool.query(`
                SELECT
                    id,
                    created,
                    project_id,
                    last_update,
                    aoi_id,
                    checkpoint_id,
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

        pgres.rows[0].token = this.token(auth, pgres.rows[0].project_id, pgres.rows[0].id);
        return Instance.json(pgres.rows[0]);
    }

    /**
     * Update Instance Properties
     *
     * @param {Number} instanceid - Specific Instance id
     * @param {Object} instance - Instance Object
     * @param {String} instance.active The state of the instance
     * @param {Number} instance.aoi_id The current AOI loaded on the instance
     * @param {Number} instance.checkpoint_id The current checkpoint loaded on the instance
     */
    async patch(instanceid, instance) {
        let pgres;

        try {
            pgres = await this.pool.query(`
                UPDATE instances
                    SET
                        active = COALESCE($2, active),
                        aoi_id = COALESCE($3, aoi_id),
                        checkpoint_id = COALESCE($4, checkpoint_id),
                        last_update = NOW()
                    WHERE
                        id = $1
                    RETURNING *
            `, [
                instanceid,
                instance.active,
                instance.aoi_id,
                instance.checkpoint_id
            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update Instance');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'Instance not found');

        return Instance.json(pgres.rows[0]);
    }

    /**
     * Set all instance states to active: false
     *
     * @returns {boolean}
     */
    async reset() {
        try {
            await this.pool.query(`
                UPDATE instances
                    SET active = False
            `, []);
        } catch (err) {
            throw new Err(500, err, 'Internal Instance Error');
        }

        return true;
    }
}

module.exports = {
    Instance
};
