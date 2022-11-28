import Err from '@openaddresses/batch-error';
import Generic from '@openaddresses/batch-generic';
import Project from './project.js';
import jwt from 'jsonwebtoken';
import Kube from '../kube.js';
import { sql } from 'slonik';

/**
 * @class
 */
export default class Instance extends Generic {
    static _table = 'instances';

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Config} config
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} instanceid Instance the user is attemping to access
     */
    static async has_auth(config, auth, projectid, instanceid) {
        const proj = await Project.has_auth(config.pool, auth, projectid);
        const instance = await Instance.from(config, auth, instanceid);

        if (instance.project_id !== proj.id) {
            throw new Err(400, null, `Instance #${instanceid} is not associated with project #${projectid}`);
        }

        return instance;
    }

    /**
     * Return a list of instances
     *
     * @param {Pool} pool - Instantianted Postgres Pool
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
    static async list(pool, projectid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;
        if (query.type === undefined || query.type === 'all') query.type = null;
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

        try {
            const pgres = await pool.query(sql`
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
                    ${query.page * query.limit}
            `);

            return this.deserialize_list(pgres);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list instances');
        }
    }

    /**
     * Generate an Instance Token for authentication with a websocket
     *
     * @param {Config} config
     * @param {Object} auth req.auth object
     *
     * @returns {String} Auth Token
     */
    gen_token(config, auth) {
        return jwt.sign({
            t: 'inst',
            u: auth.id,
            p: parseInt(this.project_id),
            i: parseInt(this.id)
        }, config.SigningSecret, {
            expiresIn: '12h'
        });
    }

    /**
     * Create a new GPU instance
     *
     * @param {Config} config
     *
     * @param {Object} instance - Instance Object
     * @param {Number} instance.uid The UID creating the instance
     * @param {Number} instance.aoi_id The current AOI loaded on the instance
     * @param {Number} instance.checkpoint_id The current checkpoint loaded on the instance
     * @param {Number} instance.batch If the instance is a batch job, specify batch ID
     */
    static async generate(config, instance) {
        if (!instance.uid) {
            throw new Err(500, null, 'Server could not determine user id');
        }

        const kube = new Kube(config, 'default');
        console.log('# type', instance.type);

        try {
            const pgres = await config.pool.query(sql`
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
                    ${instance.type}
                ) RETURNING *
            `);

            const instanceId = parseInt(pgres.rows[0].id);
            let pod = {};
            if (config.Environment !== 'local') {
                const podSpec = kube.makePodSpec(instanceId, instance.type, [{
                    name: 'INSTANCE_ID',
                    value: instanceId.toString()
                },{
                    name: 'API',
                    value: config.ApiUrl
                },{
                    name: 'SOCKET',
                    value: config.SocketUrl
                },{
                    name: 'SigningSecret',
                    value: config.SigningSecret
                },{
                    name: 'NVIDIA_DRIVER_CAPABILITIES',
                    value: 'compute,utility'
                },{
                    name: 'TileUrl',
                    value: config.TileUrl
                },
                {
                    name: 'PcTileUrl',
                    value: config.PcTileUrl
                }]);

                pod = await kube.createPod(podSpec);
            }

            const inst = this.deserialize(config.pool, pgres);
            inst.token = inst.gen_token(config, instance.uid);
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
     */
    async delete() {
        try {
            await this._pool.query(sql`
                DELETE
                    FROM
                        instances
                    WHERE
                        id = ${this.id}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal Instance Delete Error');
        }
        return true;
    }

    /**
     * Retrieve information about an instance
     *
     * @param {Config} config
     * @param {Object} auth - Express Request Auth object
     * @param {Number} instanceid Instance ID to get
     */
    static async from(config, auth, instanceid) {
        let pgres;

        try {
            pgres = await config.pool.query(sql`
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

        if (!pgres.rows.length) throw new Err(404, null, 'Instance not found');

        const podName = `${config.Deployment}-instance-${pgres.rows[0].type}-${instanceid}`;
        let podStatus;
        let pod = false;

        if (config.Environment !== 'local') {

            try {
                const kube = new Kube(config, 'default');
                podStatus = await kube.getPodStatus(podName);
                pod = await kube.getPod(podName);
            } catch (error) {
                console.error('Couldnt fetch podstatus', error.statusMessage);
            }
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No instance found');

        const inst = this.deserialize(config.pool, pgres);
        inst.token = inst.gen_token(config, auth);

        inst.status = podStatus && podStatus.status ? podStatus.status : {};
        inst.pod = pod ? pod : {};

        return inst;
    }

    /**
     * Set all instance states to active: false
     *
     * @param {Pool} pool - Instantiated Postgres Instance
     * @returns {boolean}
     */
    static async reset(pool) {
        try {
            await pool.query(sql`
                UPDATE instances
                    SET active = False
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal Instance Error');
        }

        return true;
    }
}
