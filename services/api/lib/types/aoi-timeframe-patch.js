import Err from '@openaddresses/batch-error';
import Generic from '@openaddresses/batch-generic';
import Storage from '../storage.js';
import { sql } from 'slonik';
import TimeFrame from './aoi-timeframe.js';

/**
 * @class
 */
export default class Patch extends Generic {
    static _table = 'aoi_timeframe_patch';

    /**
     * Return a list of AOI Patches
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Number} projectid - AOI Patches related to a specific project
     * @param {Number} aoiid - AOI Patches related to a specific AOI
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     */
    static async list(pool, projectid, aoiid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        let pgres;
        try {
            pgres = await pool.query(sql`
               SELECT
                    count(*) OVER() AS count,
                    id,
                    created,
                    storage
                FROM
                    aoi_timeframe_patch
                WHERE
                    project_id = ${projectid}
                    AND aoi_id = ${aoiid}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page * query.limit}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list AOI Patches');
        }

        const list = this.deserialize_list(pgres, 'patches');
        list.project_id = projectid;
        list.aoi_id = aoiid;
        return list;
    }

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Object} req Express Req Object
     */
    static async has_auth(pool, req) {
        const tf = await TimeFrame.has_auth(pool, req);
        const patch = await Patch.from(pool, req.params.patchid);

        if (patch.timeframe_id !== tf.id) {
            throw new Err(400, null, `TimeFrame Patch #${req.params.patchid} is not associated with TimeFrame #${req.params.timeframeid}`);
        }

        return patch;
    }

    /**
     * Return a sharing URL that can be used to titiler
     *
     * @param {Config} config
     */
    async url(config) {
        if (!this.storage) throw new Err(404, null, 'AOI Patch has not been uploaded');

        const storage = new Storage(config, 'aois');
        return await storage.url(`aoi-${this.aoi_id}-patch-${this.id}.tiff`);
    }

    /**
     * Upload an AOI patch geotiff and mark the AOI patch storage property as true
     *
     * @param {Config} config
     * @param {Object} file File Stream to upload
     */
    async upload(config, file) {
        if (this.storage) throw new Err(404, null, 'AOI Patch has already been uploaded');

        const storage = new Storage(config, 'aois');
        await storage.upload(file, `aoi-${this.aoi_id}-patch-${this.id}.tiff`);

        return await this.commit({
            storage: true
        });
    }

    /**
     * Download an AOI patch geotiff
     *
     * @param {Config} config
     * @param {Stream} res Stream to pipe geotiff to (usually express response object)
     */
    async download(config, res) {
        if (!this.storage) throw new Err(404, null, 'AOI has not been uploaded');

        const storage = new Storage(config, 'aois');
        await storage.download(`aoi-${this.aoi_id}-patch-${this.id}.tiff`, res);
    }

    /**
     * Delete an AOI Patch
     *
     * @param {Config} config
     */
    async delete(config) {
        let pgres;
        try {
            pgres = await this._pool.query(sql`
                DELETE
                    FROM
                        aoi_timeframe_patch
                    WHERE
                        id = ${this.id}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to delete AOI Patch');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Patch not found');

        if (pgres.rows[0].storage && config.AzureStorage) {
            const storage = new Storage(config, 'aois');
            await storage.delete(`aoi-${this.aoi_id}-patch-${this.id}.tiff`);
        }

        return true;
    }
}
