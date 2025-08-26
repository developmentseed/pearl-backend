import Err from '@openaddresses/batch-error';
import Generic from '@openaddresses/batch-generic';
import Project from './project.js';

/**
 * @class
 */
export default class OSMTag extends Generic {
    static _table = 'osmtag';

    /**
     * Ensure a user can only access their own project assets (or is an admin and can access anything)
     *
     * @param {Pool} pool Instantiated Postgres Pool
     * @param {Object} req Express Req Object
     */
    static async has_auth(pool, req) {

        const proj = await Project.has_auth(pool, req);
        const osmtag = await this.from(pool, req.params.osmtagid);

        // OSMTags without project_id are assumed to be public
        if (osmtag.project_id && osmtag.project_id !== proj.id) {
            throw new Err(400, null, `OSMTag #${req.params.osmtagid} is not associated with project #${req.params.projectid}`);
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
}
