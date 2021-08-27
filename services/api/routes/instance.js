

const Err = require('../lib/error');
const { Param } = require('../lib/util');

async function router(schema, config) {
    const auth = new (require('../lib/auth').Auth)(config);
    const project = new (require('../lib/project').Project)(config);
    const instance = new (require('../lib/instance').Instance)(config);

    /**
     * @api {get} /api/project/:projectid/instance Create Instance
     * @apiVersion 1.0.0
     * @apiName CreateInstance
     * @apiGroup Instance
     * @apiPermission user
     *
     * @apiDescription
     *     Instruct the GPU pool to start a new model instance and return a time limited session
     *     token for accessing the websockets GPU API
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.instance.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
     */
    await schema.post('/project/:projectid/instance', {
        body: 'req.body.instance.json',
        res: 'res.Instance.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await project.has_auth(req.auth, req.params.projectid);

            req.body.project_id = req.params.projectid;
            const inst = await instance.create(req.auth, req.body);

            res.json(inst);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/project/:projectid/instance/:instance Patch Instance
     * @apiVersion 1.0.0
     * @apiName PatchInstance
     * @apiGroup Instance
     * @apiPermission admin
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.instance-patch.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
     */
    await schema.patch('/project/:projectid/instance/:instanceid', {
        body: 'req.body.instance-patch.json',
        res: 'res.Instance.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'instanceid');
            await auth.is_admin(req);

            return res.json(await instance.patch(req.params.instanceid, req.body));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:projectid/instance List Instances
     * @apiVersion 1.0.0
     * @apiName ListInstances
     * @apiGroup Instance
     * @apiPermission user
     *
     * @apiDescription
     *     Return a list of instances. Note that users can only get their own instances and use of the `uid`
     *     field will be pinned to their own uid. Admins can filter by any uid or none.
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.instance-list.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListInstances.json} apiSuccess
     */
    await schema.get('/project/:projectid/instance', {
        query: 'req.query.instance-list.json',
        res: 'res.ListInstances.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await project.has_auth(req.auth, req.params.projectid);

            res.json(await instance.list(req.params.projectid, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:projectid/instance/:instanceid Get Instance
     * @apiVersion 1.0.0
     * @apiName GetInstance
     * @apiGroup Instance
     * @apiPermission user
     *
     * @apiDescription
     *     Return all information about a given instance
     *
     * @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
     */
    await schema.get('/project/:projectid/instance/:instanceid', {
        res: 'res.Instance.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'instanceid');

            res.json(await instance.has_auth(project, req.auth, req.params.projectid, req.params.instanceid));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/instance/:instanceid Self Instance
     * @apiVersion 1.0.0
     * @apiName SelfInstance
     * @apiGroup Instance
     * @apiPermission admin
     *
     * @apiDescription
     *     A newly instantiated GPU Instance does not know what it's project id is. This API
     *     allows ONLY AN ADMIN TOKEN to fetch any instance, regardless of project
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1,
     *       "uid": 123,
     *       "active": true,
     *       "created": "<date>"
     *       "pod": { ... }
     *   }
     */
    await schema.get('/instance/:instanceid', {}, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'instanceid');
            await auth.is_admin(req);

            return res.json(await instance.get(req.auth, req.params.instanceid));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {delete} /api/instance Deactivate Instances
     * @apiVersion 1.0.0
     * @apiName DeactivateInstance
     * @apiGroup Instance
     * @apiPermission admin
     *
     * @apiDescription
     *     Set all instances to active: false - used by the socket server upon initial api connection
     */
    await schema.delete('/instance', config.requiresAuth, async (req, res) => {
        try {
            await auth.is_admin(req);

            return res.json(await instance.reset());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
