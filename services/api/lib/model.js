'use strict';

const Err = require('./error');
const { BlobServiceClient } = require('@azure/storage-blob');

class Model {
    constructor(pool, config) {
        this.pool = pool;
        this.config = config;

        // don't access these services unless AzureStorage is truthy
        if (this.config.AzureStorage) {
            this.blob_client = BlobServiceClient.fromConnectionString(this.config.AzureStorage);
            this.container_client = this.blob_client.getContainerClient('models');
        }
    }

    /**
     * Create a new model
     */
    async create(model, auth) {
        let pgres;

        try {
            pgres = await this.pool.query(`
                INSERT INTO models (
                    created,
                    active,
                    uid,
                    name,
                    model_type,
                    model_finetunelayer,
                    model_numparams,
                    model_inputshape,
                    storage,
                    classes,
                    meta
                ) VALUES (
                    NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
                ) RETURNING *
            `, [
                model.active,
                auth.uid,
                model.name,
                model.model_type,
                model.model_finetunelayer,
                model.model_numparams,
                model.model_inputshape,
                model.storage,
                JSON.stringify(model.classes),
                model.meta
            ]);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        return {
            id: parseInt(pgres.rows[0].id),
            created: pgres.rows[0].created
        };
    }

    async upload() {
        if (!this.config.AzureStorage) throw new Err(424, null, 'Model storage not configured');

    }

    async download(id, res) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'Model storage not configured');

        const model = await this.get(id);
        if (!model.storage) throw new Err(404, null, 'Model has not been uploaded');
        if (!model.active) throw new Err(410, null, 'Model is set as inactive');

        const blob_client = this.container_client.getBlockBlobClient(`model-${id}.h5`);
        const dwn = await blob_client.download(0);

        dwn.readableStreamBody.pipe(res);
    }

    async list() {
        let pgres;

        try {
            pgres = await this.pool.query(`
                SELECT
                    id,
                    created,
                    active,
                    uid,
                    name
                FROM
                    models
                WHERE
                    active = true
            `, []);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        return {
            models: pgres.rows.map((r) => {
                return {
                    id: parseInt(r.id),
                    created: r.created,
                    active: r.active,
                    uid: parseInt(r.uid),
                    name: r.name
                };
            })
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
                    created,
                    active,
                    uid,
                    name,
                    model_type,
                    model_finetunelayer,
                    model_numparams,
                    model_inputshape,
                    storage,
                    classes,
                    meta
                FROM
                    models
                WHERE
                    id = $1
            `, [id]);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No model found');

        return {
            id: parseInt(pgres.rows[0].id),
            created: pgres.rows[0].created,
            active: pgres.rows[0].active,
            uid: parseInt(pgres.rows[0].uid),
            name: pgres.rows[0].name,
            model_type: pgres.rows[0].model_type,
            model_finetunelayer: pgres.rows[0].model_finetunelayer,
            model_numparams: parseInt(pgres.rows[0].model_numparams),
            model_inputshape: pgres.rows[0].model_inputshape,
            storage: pgres.rows[0].storage,
            classes: pgres.rows[0].classes,
            meta: pgres.rows[0].meta
        };
    }

    /**
     * Set a model as inactive and unusable
     */
    async delete(id) {
        let pgres;
        try {
            pgres = await this.pool.query(`
                UPDATE
                    model
                SET
                    active = false
                WHERE
                    id = $1
                RETURNING *
            `, [id]);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No model found');

        return {
            id: parseInt(pgres.rows[0].id),
            created: pgres.rows[0].created,
            active: pgres.rows[0].active
        };
    }
}

module.exports = {
    Model
};
