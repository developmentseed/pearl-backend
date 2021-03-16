'use strict';

const Err = require('./error');
const { BlobServiceClient } = require('@azure/storage-blob');
const poly = require('@turf/bbox-polygon').default;
const bbox = require('@turf/bbox').default;

class Model {
    constructor(config) {
        this.pool = config.pool;
        this.config = config;

        // don't access these services unless AzureStorage is truthy
        if (this.config.AzureStorage) {
            this.blob_client = BlobServiceClient.fromConnectionString(this.config.AzureStorage);
            this.container_client = this.blob_client.getContainerClient('models');
        }
    }

    /**
     * Return a Row as a JSON Object
     * @param {Object} row Postgres Database Row
     *
     * @returns {Object}
     */
    static json(row) {
        if (typeof row.bounds === 'string') row.bounds = JSON.parse(row.bounds)

        return {
            id: parseInt(row.id),
            created: row.created,
            active: row.active,
            uid: parseInt(row.uid),
            name: row.name,
            model_type: row.model_type,
            model_inputshape: row.model_inputshape,
            model_zoom: row.model_zoom,
            storage: row.storage,
            classes: row.classes,
            meta: row.meta,
            bounds: bbox(row.bounds)
        };
    }

    /**
     * Create a new model
     *
     * @param {Object} model Model object
     * @param {Object} user User with uid
     */
    async create(model, user) {
        let pgres;

        if (!model.bounds) model.bounds = [-180, -90, 180, 90];
        model.bounds = poly([-180, -90, 180, 90]).geometry;

        try {
            pgres = await this.pool.query(`
                INSERT INTO models (
                    active,
                    uid,
                    name,
                    model_type,
                    model_inputshape,
                    model_zoom,
                    storage,
                    classes,
                    meta,
                    bounds
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, ST_GeomFromGeoJSON($10::JSON)
                ) RETURNING
                    id,
                    created,
                    active,
                    uid,
                    name,
                    model_type,
                    model_inputshape,
                    model_zoom,
                    storage,
                    classes,
                    meta,
                    ST_AsGeoJSON(bounds)::JSON AS bounds
            `, [
                model.active,
                user.uid,
                model.name,
                model.model_type,
                model.model_inputshape,
                model.model_zoom,
                model.storage,
                JSON.stringify(model.classes),
                model.meta,
                JSON.stringify(model.bounds)
            ]);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        pgres.rows[0].bounds = model.bounds;
        return Model.json(pgres.rows[0]);
    }

    /**
     * Upload a Model and mark the Model storage property as true
     *
     * @param {Number} modelid Model ID to upload to
     * @param {Object} file File stream to upload
     */
    async upload(modelid, file) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'Model storage not configured');

        const blockBlobClient = this.container_client.getBlockBlobClient(`model-${modelid}.pt`);

        try {
            await blockBlobClient.uploadStream(file, 1024 * 1024 * 4, 1024 * 1024 * 20, {
                blobHTTPHeaders: { blobContentType: 'image/tiff' }
            });
        } catch (err) {
            throw new Err(500, err, 'Failed to uploda Model');
        }

        return await this.patch(modelid, {
            storage: true
        });
    }

    /**
     * Update Model Properties
     *
     * @param {Number} modelid - Specific Model id
     * @param {Object} model - Model Object
     * @param {Boolean} model.storage Has the storage been uploaded
     * @param {null|Number[]} model.bounds EPSG4326 Bounds of model
     */
    async patch(modelid, model) {
        let pgres;

        if (model.bounds) model.bounds = poly(model.bounds).geometry;
        try {
            pgres = await this.pool.query(`
                UPDATE models
                    SET
                        storage = COALESCE($2, storage),
                        bounds = COALESCE(ST_GeomFromGeoJSON($3::JSON), bounds)
                    WHERE
                        id = $1
                    RETURNING
                        id,
                        created,
                        active,
                        uid,
                        name,
                        model_type,
                        model_inputshape,
                        model_zoom,
                        storage,
                        classes,
                        meta,
                        ST_AsGeoJSON(bounds)::JSON AS bounds
            `, [
                modelid,
                model.storage,
                JSON.stringify(model.bounds)
            ]);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update Model');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'Model not found');

        return Model.json(pgres.rows[0]);
    }

    /**
     * Download a Model Asset
     *
     * @param {Number} modelid Model ID to download
     * @param {Stream} res Stream to pipe model to (usually express response object)
     */
    async download(modelid, res) {
        if (!this.config.AzureStorage) throw new Err(424, null, 'Model storage not configured');

        const model = await this.get(modelid);
        if (!model.storage) throw new Err(404, null, 'Model has not been uploaded');
        if (!model.active) throw new Err(410, null, 'Model is set as inactive');

        const blob_client = this.container_client.getBlockBlobClient(`model-${modelid}.pt`);
        const dwn = await blob_client.download(0);

        dwn.readableStreamBody.pipe(res);
    }

    /**
     * Return a list of active & uploaded models
     */
    async list() {
        let pgres;

        try {
            pgres = await this.pool.query(`
                SELECT
                    id,
                    created,
                    active,
                    uid,
                    name,
                    ST_AsGeoJSON(bounds)::JSON AS bounds
                FROM
                    models
                WHERE
                    active = true
                    AND storage = true
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
                    name: r.name,
                    bounds: bbox(r.bounds)
                };
            })
        };
    }

    /**
      * Retrieve information about a model
      *
      * @param {String} modelid Model id
      */
    async get(modelid) {
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
                    model_inputshape,
                    model_zoom,
                    storage,
                    classes,
                    meta,
                    ST_AsGeoJSON(bounds)::JSON AS bounds
                FROM
                    models
                WHERE
                    id = $1
            `, [modelid]);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No model found');

        return Model.json(pgres.rows[0]);
    }

    /**
     * Set a model as inactive and unusable
     *
     * @param {String} modelid Model id
     */
    async delete(modelid) {
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
            `, [modelid]);
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
