import Err from '@openaddresses/batch-error';
import Generic, { Params } from '@openaddresses/batch-generic';
import Project from './project.js';
import Storage from '../storage.js';
import { sql } from 'slonik';

/**
 * @class
 */
export default class AOI extends Generic {
    static _table = 'aoi_timeframe';

    /**
     * Return a list of aois
     *
     * @param {Pool} pool - Instantiated Postgres Pool
     *
     * @param {Number} projectid - AOIS related to a specific project
     *
     * @param {Object} query - Query Object
     * @param {Number} [query.limit=100] - Max number of results to return
     * @param {Number} [query.page=0] - Page to return
     * @param {Number} [query.checkpointid] - Only return AOIs related to a given Checkpoint
     * @param {String} [query.bookmarked] - Only return AOIs of this bookmarked state. Allowed true or false. By default returns all.
     * @param {String} [query.sort] - Sort AOI list by ascending or descending order of the created timestamp. Allowed asc or desc. Default desc.
     */
    static async list(pool, projectid, query={}) {
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
                    a.id                                AS id,
                    a.name                              AS name,
                    a.bounds                            AS bounds,
                    Round(ST_Area(a.bounds::GEOGRAPHY)) AS area,
                    a.created                           AS created
                FROM
                    aois a
                WHERE
                    a.project_id = ${projectid}
                    AND a.archived = false
                ORDER BY
                    a.created ${query.sort}
                LIMIT
                    ${query.limit}
                OFFSET
                    ${query.page * query.limit}
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to list AOIs');
        }

        const list = this.deserialize_list(pgres);
        list.project_id = projectid;

        return list;
    }

    serialize() {
        const json = super.serialize();
        json.area = this.area;
        return json;
    }

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} aoiid AOI the user is attemping to access
     */
    static async has_auth(pool, auth, projectid, aoiid) {
        const proj = await Project.has_auth(pool, auth, projectid);
        const aoi = await AOI.from(pool, aoiid);

        if (aoi.project_id !== proj.id) {
            throw new Err(400, null, `AOI #${aoiid} is not associated with project #${projectid}`);
        }

        return aoi;
    }

    /**
     * Return a sharing URL that can be used to titiler
     *
     * @param {Config} config
     */
    async url(config) {
        if (!this.storage) throw new Err(404, null, 'AOI has not been uploaded');

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
        if (this.storage) throw new Err(404, null, 'AOI has already been uploaded');

        const storage = new Storage(config, 'aois');
        await storage.upload(file, `aoi-${this.id}.tiff`);

        return await this.commit({
            storage: true
        });
    }

    /**
     * Download an AOI geotiff fabric
     *
     * @param {Config} config
     */
    async exists(config) {
        if (!this.storage) throw new Err(404, null, 'AOI has not been uploaded');

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
        if (!this.storage) throw new Err(404, null, 'AOI has not been uploaded');

        const storage = new Storage(config, 'aois');
        return await storage.download(`aoi-${this.id}.tiff`, res);
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
                    a.id                                AS id,
                    a.name                              AS name,
                    a.bounds                            AS bounds,
                    Round(ST_Area(a.bounds::GEOGRAPHY)) AS area,
                    a.project_id                        AS project_id,
                    a.bookmarked                        AS bookmarked,
                    a.bookmarked_at                     AS bookmarked_at,
                    a.checkpoint_id                     AS checkpoint_id,
                    a.created                           AS created,
                    a.storage                           AS storage,
                    a.patches                           AS patches,
                    a.px_stats                          AS px_stats,
                    a.classes                           AS classes
                FROM
                    aois a
                WHERE
                    a.id = ${id}
                AND
                    a.archived = false
            `);
        } catch (err) {
            throw new Err(500, err, 'Failed to get AOI');
        }

        if (!pgres.rows.length) throw new Err(404, null, 'aoi not found');

        return this.deserialize(pool, pgres);
    }
}
