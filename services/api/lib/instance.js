const Project = require('./project');
const Err = require('./error');
const jwt = require('jsonwebtoken');
const { Kube } = require('./kube');
const { sql } = require('slonik');

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
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} instanceid Instance the user is attemping to access
     */
    async has_auth(pool, auth, projectid, instanceid) {
        const proj = await Project.has_auth(pool, auth, projectid);
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
            batch: row.batch,
            project_id: parseInt(row.project_id),
            aoi_id: parseInt(row.aoi_id),
            checkpoint_id: parseInt(row.checkpoint_id),
            last_update: row.last_update,
            created: row.created,
            active: row.active,
            type: row.type,
            status: row.status
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
     * @param {Number} [query.batch] - Filter by batch status (batch=true/false - Show/Hide batches, batch=<num> show instance with specific batch)
     */
    async list(projectid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;
        if (query.type === undefined) query.type = null;
        if (query.batch === undefined) query.batch = null;

        let active = null;
        if (query.status === 'active') {
            active = true;
        } else if (query.status === 'inactive') {
            active = false;
        } else if (query.status === 'all') {
            active = null;
        }

        let batch = null;
        let batch_id = null;
        if (query.batch === true) {
            batch = true;
        } else if (query.batch === false) {
            batch = false;
        }

        if (!isNaN(parseInt(query.batch))) {
            batch_id = parseInt(query.batch);
        }

        let pgres;
        try {
            pgres = await this.pool.query(sql`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    batch,
                    active,
                    created,
                    type
                FROM
                    instances
                WHERE
                    project_id = ${projectid}
                    AND (${query.type}::TEXT IS NULL OR type = ${query.type})
                    AND (${active}::BOOLEAN IS NULL OR active = ${active})
                    AND (
                        (${batch}::BOOLEAN IS NULL AND ${batch_id}::BIGINT IS NULL)
                        OR (${batch}::BOOLEAN = True AND batch IS NOT NULL)
                        OR (${batch}::BOOLEAN = False AND batch IS NULL)
                        OR (${batch_id}::BIGINT IS NOT NULL AND ${batch_id}::BIGINT = batch)
                    )
                ORDER BY
                    last_update
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list instances');
        }

        return {
            total: pgres.rows.length ? parseInt(pgres.rows[0].count) : 0,
            instances: pgres.rows.map((row) => {
                return {
                    id: row.id,
                    batch: row.batch,
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
            const pgres = await this.pool.query(sql`
                SELECT
                    count(*) OVER() AS count
                FROM
                    instances
                WHERE
                    type = 'gpu'
                AND
                    active IS True
            `);

            return pgres.rows.length ? pgres.rows[0].count : 0;

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
     * @param {Number} instance.batch If the instance is a batch job, specify batch ID
     */
    async create(auth, instance) {
        if (!auth.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        }

        let podList = [];
        if (this.config.Environment !== 'local') {
            podList = await this.kube.listPods();
        }

        let type = 'gpu';
        if (podList.length) {
            const activePods = podList.filter((p) => {
                return p.status.phase === 'Running';
            });

            console.log('# activePods', activePods.length);
            type = activePods.length < this.config.GpuCount ? 'gpu' : 'cpu';
        }

        console.log('# type', type);

        try {
            const pgres = await this.pool.query(sql`
                INSERT INTO instances (
                    project_id,
                    aoi_id,
                    checkpoint_id,
                    batch,
                    type
                ) VALUES (
                    ${instance.project_id},
                    ${instance.aoi_id || null},
                    ${instance.checkpoint_id || null},
                    ${instance.batch || null},
                    ${type}
                ) RETURNING *
            `);

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
            await this.pool.query(sql`
                DELETE
                    FROM
                        instances
                    WHERE
                        id = ${instanceid}
            `);
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
            pgres = await this.pool.query(sql`
                SELECT
                    *
                FROM
                    instances
                WHERE
                    id = ${instanceid}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal Instance Error');
        }

        const podName = `${this.config.Deployment}-gpu-${instanceid}`;
        let podStatus;

        if (this.config.Environment !== 'local') {
            try {
                podStatus = await this.kube.getPodStatus(podName);
            } catch (error) {
                console.error('Couldnt fetch podstatus', error.statusMessage);
            }
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No instance found');

        pgres.rows[0].token = this.token(auth, pgres.rows[0].project_id, pgres.rows[0].id);
        pgres.rows[0].status = podStatus && podStatus.status ? podStatus.status : {};
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

        if (instance.active == undefined) {
            instance.active = null;
        }

        if (instance.aoi_id == undefined) {
            instance.aoi_id = null;
        }

        if (instance.checkpoint_id == undefined) {
            instance.checkpoint_id = null;
        }

        try {
            pgres = await this.pool.query(sql`
                UPDATE instances
                    SET
                        active = COALESCE(${instance.active}, active),
                        aoi_id = COALESCE(${instance.aoi_id}, aoi_id),
                        checkpoint_id = COALESCE(${instance.checkpoint_id}, checkpoint_id),
                        last_update = NOW()
                    WHERE
                        id = ${instanceid}
                    RETURNING *
            `);
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
            await this.pool.query(sql`
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
