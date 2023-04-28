import Err from '@openaddresses/batch-error';
import Generic from '@openaddresses/batch-generic';
import Storage from '../storage.js';
import { sql } from 'slonik';

/**
 * @class
 */
export default class AOIShare extends Generic {
    static _table = 'aoi_timeframe_share';

    /**
     * Return a list of AOI Shares
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Number} projectid - AOI Shares related to a specific project
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     */
    static async list(pool, projectid, query) {
        if (!query) query = {};
        if (!query.limit) query.limit = 100;
        if (!query.page) query.page = 0;

        let pgres;
        try {
            pgres = await pool.query(sql`
               SELECT
                    count(*) OVER() AS count,
                    aoi_timeframe_share.uuid,
                    aoi_timeframe_share.aoi_id,
                    Row_To_JSON(tf.*) AS timeframe,
                    Row_To_JSON(aois.*) AS aoi,
                    Row_To_JSON(mosaics.*) AS mosaic,
                    aoi_timeframe_share.timeframe_id,
                    aoi_timeframe_share.created,
                    aoi_timeframe_share.storage
                FROM
                    aoi_timeframe_share
                        LEFT JOIN aoi_timeframe tf
                            ON aoi_timeframe_share.timeframe_id = tf.id
                        LEFT JOIN aois
                            ON aoi_timeframe_share.aoi_id = aois.id
                        LEFT JOIN mosaics
                            ON tf.mosaic = mosaics.name
                WHERE
                    aoi_timeframe_share.project_id = ${projectid}
                ORDER BY
                    created DESC
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page * query.limit}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to list AOI Shares');
        }

        return this.deserialize_list(pgres, 'shares');
    }

    /**
     * Return a sharing URL that can be used to titiler
     *
     * @param {Config} config
     */
    async url(config) {
        if (!this.storage) throw new Err(404, null, 'AOI Share has not been uploaded');

        const storage = new Storage(config, 'aois');
        return await storage.url(`share-${this.uuid}.tiff`);
    }

    /**
     * Upload an AOI share geotiff and mark the AOI share storage property as true
     *
     * @param {Config} config
     * @param {Object} file File Stream to upload
     */
    async upload(config, file) {
        if (this.storage) throw new Err(404, null, 'AOI Share has already been uploaded');

        const storage = new Storage(config, 'aois');
        await storage.upload(file, `share-${this.uuid}.tiff`);

        await this.commit({
            storage: true
        }, {
            column: 'uuid'
        });

        return AOIShare.from(config.pool, this.uuid, {
            column: 'uuid'
        });
    }

    /**
     * Download an AOI share geotiff
     *
     * @param {Config} config
     * @param {Stream} res Stream to pipe geotiff to (usually express response object)
     */
    async download(config, res) {
        if (!this.storage) throw new Err(404, null, 'AOI Share has not been uploaded');

        const storage = new Storage(config, 'aois');
        await storage.download(`share-${this.uuid}.tiff`, res);
    }

    /**
     * Delete an AOI Share
     *
     * @param {Config} config
     */
    async delete(config) {
        let pgres;
        try {
            pgres = await this._pool.query(sql`
                DELETE
                    FROM
                        aoi_timeframe_share
                    WHERE
                        aoi_id = ${this.aoi_id}
                        AND uuid = ${this.uuid}
                    RETURNING *
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to delete AOI Share');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Share not found');

        if (pgres.rows[0].storage && config.AzureStorage) {
            const storage = new Storage(config, 'aois');
            await storage.delete(`share-${this.uuid}.tiff`);
        }

        return true;
    }

    /**
     * Return a single aoi share
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {String} shareuuid - Specific AOI Share UUID
     */
    static async from(pool, shareuuid) {
        let pgres;
        try {
            pgres = await pool.query(sql`
               SELECT
                    s.uuid,
                    s.aoi_id,
                    s.project_id,
                    s.timeframe_id,
                    s.bounds,
                    s.created,
                    s.patches,
                    s.storage,
                    tf.checkpoint_id,
                    c.classes,
                    Row_To_Json(aois.*) AS aoi,
                    Row_To_Json(tf.*) AS timeframe,
                    Row_To_Json(mosaics.*) AS mosaic
                FROM
                    aoi_timeframe_share s
                        LEFT JOIN aoi_timeframe tf
                            ON s.timeframe_id = tf.id
                        LEFT JOIN checkpoints c
                            ON tf.checkpoint_id = c.id
                        LEFT JOIN aois
                            ON s.aoi_id = aois.id
                        LEFT JOIN mosaics
                            ON tf.mosaic = mosaics.name
                WHERE
                    s.uuid = ${shareuuid}
            `);
        } catch (err) {
            throw new Err(500, new Error(err), 'Failed to get AOI Share');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI Share not found');

        return this.deserialize(pool, pgres);
    }
}
