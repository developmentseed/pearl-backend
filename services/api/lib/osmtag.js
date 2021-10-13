const Project = require('../lib/project');
const Err = require('./error');
const Generic = require('./generic');
const { sql } = require('slonik');

/**
 * @class
 */
class OSMTag extends Generic {
    static _table = 'osmtag';
    static _patch = false;
    static _res = require('../schema/res.OSMTag.json');

    constructor() {
        super();
    }

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Object} auth req.auth object
     * @param {Number} projectid Project the user is attempting to access
     * @param {Number} osmtagid Checkpoint the user is attemping to access
     */
    static async has_auth(pool, auth, projectid, osmtagid) {

        const proj = await Project.has_auth(pool, auth, projectid);
        const osmtag = await this.from(pool, osmtagid);

        // OSMTags without project_id are assumed to be public
        if (osmtag.project_id && osmtag.project_id !== proj.id) {
            throw new Err(400, null, `OSMTag #${osmtagid} is not associated with project #${projectid}`);
        }

        return osmtag;
    }

    static validate(osmtag, classes) {
        if (Object.keys(osmtag).length !== classes.length) throw new Err(400, null, 'OSMTag must have key entry for every class in array');

        for (let i = 0; i < classes.length; i++) {
            if (!osmtag[i]) throw new Err(400, null, `OSMTag missing entry for ${classes[i].name} class (Element ${i})`);
        }

        return true;
    }

    async commit(pool) {
        try {
            await pool.query(sql`
                UPDATE osmtag
                    SET
                        tagmap = ${JSON.stringify(this.tagmap)}
                    WHERE
                        id = ${this.id}
            `);

            return this;
        } catch (err) {
            throw new Err(500, err, 'Failed to update OSMTag');
        }
    }

    static async generate(pool, osmtag) {
        try {
            if (!osmtag.project_id) osmtag.project_id = null;

            const pgres = await pool.query(sql`
                INSERT INTO osmtag (
                    project_id,
                    tagmap
                ) VALUES (
                    ${osmtag.project_id},
                    ${JSON.stringify(osmtag.tagmap)}
                ) RETURNING *
            `);

            return this.deserialize(pgres.rows[0]);
        } catch (err) {
            throw new Err(500, err, 'Failed to generate OSMTag');
        }
    }
}

module.exports = OSMTag;
