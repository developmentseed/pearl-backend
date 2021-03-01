'use strict';

const Err = require('./error');
const { BlobServiceClient } = require('@azure/storage-blob');

class CheckPoint {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;

        // don't access these services unless AzureStorage is truthy
        if (this.config.AzureStorage) {
            this.blob_client = BlobServiceClient.fromConnectionString(this.config.AzureStorage);
            this.container_client = this.blob_client.getContainerClient('checkpoints');
        }
    }

    /**
     * Return a Row as a JSON Object
     * @param {Object} row Postgres Database Row
     */
     static json(row) {
        return {
            id: parseInt(row.id),
            name: row.name,
            classes: row.classes,
            created: row.created,
            storage: row.storage
        };
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
     * Upload a Checkpoint and mark the Checkpoint storage property as true
     *
     * @param {Number} checkpointid Checkpoint ID to upload to
     * @param {Object} file File stream to upload
     */
    async upload(checkpointid, file) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'Checkpoint storage not configured');

        const blockBlobClient = this.container_client.getBlockBlobClient(`checkpoint-${checkpointid}`);

        try {
            await blockBlobClient.uploadStream(file, 1024 * 1024 * 4, 1024 * 1024 * 20, {
                blobHTTPHeaders: { blobContentType: 'application/octet-stream' }
            });
        } catch (err) {
            throw new Err(500, err, 'Failed to uploda Checkpoint');
        }

        return await this.patch(checkpointid, {
            storage: true
        });
    }

    /**
     * Download a Checkpoint Asset
     *
     * @param {Number} checkpointid Checkpoint ID to download
     * @param {Stream} res Stream to pipe model to (usually express response object)
     */
    async download(checkpointid, res) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'Model storage not configured');

        const checkpoint = await this.get(checkpointid);
        if (!checkpoint.storage) throw new Err(404, null, 'Checkpoint has not been uploaded');

        const blob_client = this.container_client.getBlockBlobClient(`checkpoint-${checkpointid}`);
        const dwn = await blob_client.download(0);

        dwn.readableStreamBody.pipe(res);
    }

    /**
     * Update Checkpoint Properties
     *
     * @param {Number} checkpointid - Specific Model id
     * @param {Object} checkpoint - Checkpoint Object
     * @param {Boolean} checkpoint.storage Has the storage been uploaded
     */
    async patch(checkpointid, checkpoint) {
        let pgres;

        try {
            pgres = await this.pool.query(`
                UPDATE checkpoints
                    SET
                        storage = COALESCE($2, storage)
                    WHERE
                        id = $1
                    RETURNING *
            `, [
                checkpointid,
                checkpoint.storage
            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update Checkpoint');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'Checkpoint not found');

        return CheckPoint.json(pgres.rows[0]);
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

        return CheckPoint(pgres.rows[0]);
    }

    /**
     * Update a given checkpoint
     *
     * @param {Object} checkpoint Checkpoint Object
     * @param {String} checkpoint.name
     */


    /**
     * Create a new Checkpoint
     *
     * @param {Number} projectid - Checkpoint related to a specific instance
     * @param {Object} checkpoint - Checkpoint Object
     */
    async create(projectid, checkpoint) {
        if (!checkpoint) checkpoint = {};

        try {
            const pgres = await this.pool.query(`
                INSERT INTO checkpoints (
                    project_id,
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

            return CheckPoint.json(pgres.rows[0]);
        } catch (err) {
            throw new Err(500, err, 'Failed to create checkpoint');
        }
    }
}

module.exports = {
    CheckPoint
};
