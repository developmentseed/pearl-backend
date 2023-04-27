import Err from '@openaddresses/batch-error';
import AOI from './aoi.js';
import Generic, { Params } from '@openaddresses/batch-generic';
import Storage from '../storage.js';
import { sql } from 'slonik';

/**
 * @class
 */
export default class AOITimeframe extends Generic {
    static _table = 'aoi_timeframe';

    /**
     * Return a list of aois
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     *
     * @param {Number} aoiid - TimeFrames related to a specific project/aoi
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     * @param {Number} [query.checkpointid] - Only return AOIs related to a given Checkpoint
     * @param {String} [query.bookmarked] - Only return AOIs of this bookmarked state. Allowed true or false. By default returns all.
     * @param {String} [query.sort] - Sort AOI list by ascending or descending order of the created timestamp. Allowed asc or desc. Default desc.
     */
    static async list(pool, aoiid, query = {}) {
        query.limit = Params.integer(query.limit, { default: 100 });
        query.page = Params.integer(query.page, { default: 0 });

        if (!query.sort || query.sort === 'desc') {
            query.sort = sql`desc`;
        } else {
            query.sort = sql`asc`;
        }

        if (query.checkpointid === undefined) query.checkpointid = null;
        if (query.bookmarked === undefined) query.bookmarked = null;

        let pgres;
        try {
            pgres = await pool.query(sql`
               SELECT
                    count(*) OVER() AS count,
                    a.*,
                    c.name                              AS checkpoint_name
                FROM
                    aoi_timeframe a,
                    checkpoints c
                WHERE
                    a.checkpoint_id = c.id
                    AND a.aoi_id = ${aoiid}
                    AND (${query.checkpointid}::BIGINT IS NULL OR checkpoint_id = ${query.checkpointid})
                    AND (${query.bookmarked}::BOOLEAN IS NULL OR a.bookmarked = ${query.bookmarked})
                    AND a.archived = false
                ORDER BY
                    a.created ${query.sort}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page * query.limit}
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to list AOI TimeFrames');
        }

        const list = this.deserialize_list(pgres, 'timeframes');

        return list;
    }

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Object} req req Express Request object
     */
    static async has_auth(pool, req) {
        const aoi = await AOI.has_auth(pool, req);
        const timeframe = await this.from(pool, req.params.timeframeid);

        if (timeframe.aoi_id !== aoi.id) {
            throw new Err(400, null, `TiumeFrame #${req.params.timeframeid} is not associated with AOI #${req.params.aoiid}`);
        }

        return timeframe;
    }

    /**
     * Download an AOI geotiff fabric
     *
     * @param {Config} config
     */
    async exists(config) {
        if (!this.storage) throw new Err(404, null, 'AOI TimeFrame has not been uploaded');

        const storage = new Storage(config, 'aois');
        return await storage.exists(`aoi-${this.id}.tiff`);
    }

    /**
     * Download an AOI geotiff fabric
     *
     * @param {Config} config
     * @param {Stream} res Stream to pipe geotiff to (usually express response object)
     */
    async download(config, res) {
        if (!this.storage) throw new Err(404, null, 'AOI TimeFrame has not been uploaded');

        const storage = new Storage(config, 'aois');
        return await storage.download(`aoi-${this.id}.tiff`, res);
    }

    /**
     * Return a sharing URL that can be used to titiler
     *
     * @param {Config} config
     */
    async url(config) {
        if (!this.storage) throw new Err(404, null, 'AOI TimeFrame has not been uploaded');

        const storage = new Storage(config, 'aois');
        return await storage.url(`aoi-${this.id}.tiff`);
    }

    /**
     * Upload an AOI geotiff and mark the AOI storage property as true
     *
     * @param {Config} config
     * @param {Object} file File Stream to upload
     */
    async upload(config, file) {
        if (this.storage) throw new Err(404, null, 'AOI TimeFrame has already been uploaded');

        const storage = new Storage(config, 'aois');
        await storage.upload(file, `aoi-${this.id}.tiff`);

        return await this.commit({
            storage: true
        });
    }

    /**
     * Return a single aoi
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     * @param {Number} id - Specific AOI id
     */
    static async from(pool, id) {
        let pgres;
        try {
            pgres = await pool.query(sql`
               SELECT
                    a.*,
                    Row_To_JSON(mosaics.*) AS mosaic
                FROM
                    aoi_timeframe a
                        LEFT JOIN mosaics
                            ON a.mosaic = mosaics.name
                WHERE
                    a.id = ${id}
                AND
                    a.archived = false
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to get AOI TimeFrame');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'AOI TimeFrame not found');

        return this.deserialize(pool, pgres);
    }
}
