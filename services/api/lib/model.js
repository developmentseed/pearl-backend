const { Err } = require('@openaddresses/batch-schema');
const Storage = require('./storage');
const poly = require('@turf/bbox-polygon').default;
const bbox = require('@turf/bbox').default;
const { sql } = require('slonik');
const Generic = require('./generic');

/**
 * @class
 */
class Model extends Generic {
    static _table = 'models';
    static _res = require('../schema/res.Model.json');
    static _patch = require('../schema/req.body.PatchModel.json');

    constructor() {
        super();
    }

    serialize() {
        const res = super.serialize();

        if (!Array.isArray(res.bounds)) {
            res.bounds = bbox(res.bounds);
        }

        return res;
    }

    /**
     * Return a list of active & uploaded models
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     */
    static async list(pool) {
        let pgres;

        try {
            pgres = await pool.query(sql`
                SELECT
                    id,
                    created,
                    active,
                    uid,
                    name,
                    meta,
                    classes,
                    bounds
                FROM
                    models
                WHERE
                    active = true
                    AND storage = true
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        const models = this.deserialize(pgres.rows);

        models.models = models.models.map((m) => {
            m.bounds = bbox(m.bounds);
            return m;
        });

        return models;
    }


    /**
     * Create a new model
     *
     * @param {Pool} pool Instantiated Postres Pool
     * @param {Object} model Model Object
     * @param {Number} model.uid
     * @param {String} model.name
     * @param {Boolean} model.active
     * @param {String} model.model_type
     * @param {Number[]} model.model_inputshape
     * @param {Number} model.model_zoom
     * @param {Object[]} model.classes
     * @param {Object} model.meta
     * @param {Number[]} model.bounds
     */
    static async generate(pool, model) {
        if (!model.bounds) model.bounds = [-180, -90, 180, 90];
        model.bounds = poly(model.bounds).geometry;

        let pgres;
        try {
            pgres = await pool.query(sql`
                INSERT INTO models (
                    uid,
                    name,
                    active,
                    model_type,
                    model_inputshape,
                    model_zoom,
                    storage,
                    classes,
                    meta,
                    bounds,
                    osmtag_id
                ) VALUES (
                    ${model.uid},
                    ${model.name},
                    ${model.active},
                    ${model.model_type},
                    ${sql.array(model.model_inputshape, 'int8')},
                    ${model.model_zoom},
                    False,
                    ${JSON.stringify(model.classes)}::JSONB,
                    ${JSON.stringify(model.meta)}::JSONB,
                    ST_GeomFromGeoJSON(${JSON.stringify(model.bounds)}::JSON),
                    ${model.osmtag_id || null}
                ) RETURNING *
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        return this.deserialize(pgres.rows[0]);
    }

    /**
     * Upload a Model and mark the Model storage property as true
     *
     * @param {Config} config
     * @param {Object} file File stream to upload
     */
    async upload(config, file) {
        if (this.storage) throw new Err(404, null, 'Model has already been uploaded');

        const storage = new Storage(config, 'models');
        await storage.upload(file, `model-${this.id}.zip`, 'application/zip');

        this.storage = true;
        return await this.commit(config.pool);
    }

    /**
     * Update Model Properties
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     */
    async commit(pool) {
        let pgres;

        if (Array.isArray(this.bounds)) this.bounds = poly(this.bounds).geometry;

        try {
            pgres = await pool.query(sql`
                UPDATE models
                    SET
                        storage = ${this.storage},
                        bounds = ST_GeomFromGeoJSON(${JSON.stringify(this.bounds)}),
                        osmtag_id = ${this.osmtag_id}
                    WHERE
                        id = ${this.id}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to update Model');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'Model not found');

        return this;
    }

    /**
     * Download a Model Asset
     *
     * @param {Config} config
     * @param {Stream} res Stream to pipe model to (usually express response object)
     */
    async download(config, res) {
        if (!this.storage) throw new Err(404, null, 'Model has not been uploaded');
        if (!this.active) throw new Err(410, null, 'Model is set as inactive');

        const storage = new Storage(config, 'models');
        await storage.download(`model-${this.id}.zip`, res);
    }

    /**
     * Set a model as inactive and unusable
     *
     * @param {Pool} pool Instantiated Postgres Pool
     */
    async delete(pool) {
        let pgres;
        try {
            pgres = await pool.query(sql`
                UPDATE
                    models
                SET
                    active = false
                WHERE
                    id = ${this.id}
                RETURNING *
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'No model found');

        this.active = false;

        return this;
    }
}

module.exports = Model;
