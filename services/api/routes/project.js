const Err = require('../lib/error');
const { Param } = require('../lib/util');
const Mosaic = require('../lib/mosaic');
const Project = require('../lib/project');

async function router(schema, config) {
    const aoi = new (require('../lib/aoi').AOI)(config);
    const checkpoint = new (require('../lib/checkpoint').CheckPoint)(config);
    const model = new (require('../lib/model').Model)(config);
    const instance = new (require('../lib/instance').Instance)(config);

    /**
     * @api {post} /api/project List Projects
     * @apiVersion 1.0.0
     * @apiName ListProjects
     * @apiGroup Projects
     * @apiPermission user
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.project-list.json} apiParam
     *
     * @apiDescription
     *     Return a list of projects
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "total": 1,
     *       "projects": [{
     *           "id": 1,
     *           "name": 123,
     *           "created": "<date>",
     *           "aois": [{
     *              "id": 1,
     *              "name": "aoi name",
     *              "created": "<date>",
     *              "storage": false
     *            }],
     *            "checkpoints": []
     *       }]
     *   }
     */
    await schema.get('/project', {
        query: 'req.query.project-list.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const results = await Project.list(config.pool, req.auth.uid, req.query);
            if (results.projects && results.projects.length) {
                for (let index = 0; index < results.projects.length; index++) {
                    const p = results.projects[index];
                    const aois = await aoi.list(p.id, { bookmarked: 'true' });
                    const checkpoints = await checkpoint.list(p.id, { bookmarked: 'true' });
                    // remove reduntant project id
                    delete aois.project_id;
                    delete checkpoints.project_id;
                    p['aois'] = aois.aois;
                    p['checkpoints'] = checkpoints.checkpoints;
                    p['model'] = {};
                    if (p.model_id) {
                        p['model'] = await model.get(p.model_id);
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
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1,
     *       "name": "Test Project",
     *       "created": "<date>"
     *       "model_id": 1,
     *       "mosaic": "naip.latest"
     *   }
     */
    await schema.get('/project/:projectid', {}, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');

            const proj = (await Project.has_auth(config.pool, req.auth, req.params.projectid)).serialize();

            delete proj.uid;

            const checkpoints = await checkpoint.list(req.params.projectid, { bookmarked: 'true' });
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
     * @apiSchema (Body) {jsonschema=../schema/req.body.project-patch.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Project.json} apiSuccess
     */
    await schema.patch('/project/:projectid', {
        body: 'req.body.project-patch.json',
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

            const insts = await instance.list(req.params.projectid);
            for (const inst of insts.instances) {
                if (inst.active) throw new Error(400, null, 'Cannot continue project deletion with active instance');
                await instance.delete(inst.id);
            }

            // TODO - Add support for paging aois/checkpoints/instances for projects with > 100 features
            const aois = await aoi.list(req.params.projectid);
            aois.aois.forEach(async (a) => { await aoi.delete(a.id); });

            const chkpts = await checkpoint.list(req.params.projectid);
            chkpts.checkpoints.forEach(async (c) => { await checkpoint.delete(c.id); });

            await proj.delete(config.pool);
            return res.json({});
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;