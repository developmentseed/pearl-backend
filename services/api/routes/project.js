const Err = require('../lib/error');
const { Param } = require('../lib/util');
const Mosaic = require('../lib/mosaic');
const Project = require('../lib/project');
const AOI = require('../lib/aoi');
const Model = require('../lib/model');
const Instance = require('../lib/instance');
const Checkpoint = require('../lib/checkpoint');

async function router(schema, config) {

    /**
     * @api {post} /api/project List Projects
     * @apiVersion 1.0.0
     * @apiName ListProjects
     * @apiGroup Projects
     * @apiPermission user
     *
     * @apiDescription
     *     Return a list of projects
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListProjects.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListProjects.json} apiSuccess
     */
    await schema.get('/project', {
        query: 'req.query.ListProjects.json',
        res: 'res.ListProjects.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const results = await Project.list(config.pool, req.auth.uid, req.query);
            if (results.projects && results.projects.length) {
                for (let index = 0; index < results.projects.length; index++) {
                    const p = results.projects[index];
                    const aois = await AOI.list(config.pool, p.id, { bookmarked: true });
                    const checkpoints = await Checkpoint.list(config.pool, p.id, { bookmarked: true });
                    // remove reduntant project id
                    delete aois.project_id;
                    delete checkpoints.project_id;
                    p['aois'] = aois.aois;
                    p['checkpoints'] = checkpoints.checkpoints;
                    p['model'] = {};
                    if (p.model_id) {
                        p['model'] = (await Model.from(config.pool, p.model_id)).serialize();
                        delete p.model_id;
                    }
                }
            }
            res.json(results);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:projectid Get Project
     * @apiVersion 1.0.0
     * @apiName GetProject
     * @apiGroup Projects
     * @apiPermission user
     *
     * @apiDescription
     *     Return all information about a given project
     *
     * @apiSchema {jsonschema=../schema/res.Project.json} apiSuccess
     */
    await schema.get('/project/:projectid', {
        res: 'res.Project.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');

            const proj = (await Project.has_auth(config.pool, req.auth, req.params.projectid)).serialize();

            delete proj.uid;

            const checkpoints = await Checkpoint.list(config.pool, req.params.projectid, { bookmarked: true });
            // remove reduntant project id
            delete checkpoints.project_id;
            proj['checkpoints'] = checkpoints.checkpoints;

            return res.json(proj);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/project Create Project
     * @apiVersion 1.0.0
     * @apiName CreateProject
     * @apiGroup Projects
     * @apiPermission user
     *
     * @apiDescription
     *     Create a new project
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.CreateProject.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Project.json} apiSuccess
     */
    await schema.post('/project', {
        body: 'req.body.CreateProject.json',
        res: 'res.Project.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            if (!req.body.mosaic || !Mosaic.list().mosaics.includes(req.body.mosaic)) throw new Err(400, null, 'Invalid Mosaic');

            const proj = await Project.generate(config.pool, req.auth.uid, req.body);
            return res.json(proj.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/project/:projectid Patch Project
     * @apiVersion 1.0.0
     * @apiName PatchProject
     * @apiGroup Projects
     * @apiPermission user
     *
     * @apiDescription
     *     Update an existing Project
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchProject.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Project.json} apiSuccess
     */
    await schema.patch('/project/:projectid', {
        body: 'req.body.PatchProject.json',
        res: 'res.Project.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');

            const proj = await Project.has_auth(config.pool, req.auth, req.params.projectid);
            proj.patch(req.body);
            await proj.commit(config.pool);

            return res.json(proj.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {delete} /api/project/:projectid Delete Project
     * @apiVersion 1.0.0
     * @apiName DeleteProject
     * @apiGroup Project
     * @apiPermission user
     *
     * @apiDescription
     *     Archive a project
     *
     * @apiSchema {jsonschema=../schema/res.Project.json} apiSuccess
     */
    await schema.delete('/project/:projectid', {
        res: 'res.Project.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            const proj = await Project.has_auth(config.pool, req.auth, req.params.projectid);

            const insts = await Instance.list(config.pool, req.params.projectid);
            for (const inst of insts.instances) {
                if (inst.active) throw new Error(400, null, 'Cannot continue project deletion with active instance');

                const instance = new Instance();
                instance.id = inst.id;
                await instance.delete(config.pool);
            }

            // TODO - Add support for paging aois/checkpoints/instances for projects with > 100 features
            const aois = await AOI.list(config.pool, req.params.projectid);
            aois.aois.forEach(async (a) => {
                const aoi = await AOI.from(config.pool, a.id);
                await aoi.delete(config.pool);
            });

            const chkpts = await Checkpoint.list(config.pool, req.params.projectid);
            chkpts.checkpoints.forEach(async (c) => {
                const ch = await Checkpoint.from(config.pool, c.id);
                await ch.delete(config.pool);
            });

            await proj.delete(config.pool);
            return res.json({});
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
