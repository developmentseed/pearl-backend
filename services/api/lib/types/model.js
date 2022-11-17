import Err from '@openaddresses/batch-error';
import Generic from '@openaddresses/batch-generic';
import Storage from '../storage.js';
import bbox from '@turf/bbox';
import { sql } from 'slonik';

/**
 * @class
 */
export default class Model extends Generic {
    static _table = 'models';

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
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     * @param {String} [query.order=asc] Sort Order (asc/desc)
     * @param {Boolean} [query.storage=true]
     * @param {Boolean} [query.active=true]
     */
    static async list(pool, query = {}) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        if (!query.sort || query.sort === 'desc') {
            query.sort = sql`desc`;
        } else {
            query.sort = sql`asc`;
        }

        let pgres;

        if (query.storage === undefined) query.storage = true;
        if (query.active === undefined) query.active = true;

        try {
            pgres = await pool.query(sql`
                SELECT
                    count(*) OVER() AS count,
                    id,
                    created,
                    active,
                    uid,
                    name,
                    meta,
                    classes,
                    bounds,
                    storage
                FROM
                    models
                WHERE
                    (${query.storage}::BOOLEAN IS NULL OR storage = ${query.storage}::BOOLEAN)
                    AND (${query.active}::BOOLEAN IS NULL OR active = ${query.active}::BOOLEAN)
                ORDER BY
                    created ${query.sort}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page * query.limit}
            `);
        } catch (err) {
            throw new Err(500, err, 'Internal Model Error');
        }

        const models = this.deserialize_list(pgres);

        models.models = models.models.map((m) => {
            m.bounds = bbox(m.bounds);
            return m;
        });

        return models;
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

        return await this.commit({
            storage: true
        });
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
     */
    async delete() {
        const modelProjects = await this._pool.query(sql`
            SELECT
                id
            FROM
                projects
            WHERE
                model_id = ${this.id}
        `);

        if (modelProjects.rows.length > 0) {
            throw new Err(403, null, 'Model is being used in other projects and can not be deleted');
        }

        let pgres;
        try {
            pgres = await this._pool.query(sql`
                DELETE FROM
                    models
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
