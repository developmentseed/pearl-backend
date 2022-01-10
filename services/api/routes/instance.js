const { Err } = require('@openaddresses/batch-schema');
const Project = require('../lib/project');
const Instance = require('../lib/instance');
const User = require('../lib/user');

async function router(schema, config) {

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
     * @apiSchema (Body) {jsonschema=../schema/req.body.CreateInstance.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
     */
    await schema.post('/project/:projectid/instance', {
        ':projectid': 'integer',
        body: 'req.body.CreateInstance.json',
        res: 'res.Instance.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            req.body.project_id = req.params.projectid;
            req.body.uid = req.auth.uid;
            req.body.type = req.body.type ? req.body.type : 'cpu';

            const inst = await Instance.generate(config, req.body);

            res.json(inst.serialize());
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
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchInstance.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
     */
    await schema.patch('/project/:projectid/instance/:instanceid', {
        ':projectid': 'integer',
        ':instanceid': 'integer',
        body: 'req.body.PatchInstance.json',
        res: 'res.Instance.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            const instance = await Instance.from(config, req.auth, req.params.instanceid);
            instance.patch(req.body);
            await instance.commit(config.pool);

            return res.json(instance.serialize());
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
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListInstances.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListInstances.json} apiSuccess
     */
    await schema.get('/project/:projectid/instance', {
        ':projectid': 'integer',
        query: 'req.query.ListInstances.json',
        res: 'res.ListInstances.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            res.json(await Instance.list(config.pool, req.params.projectid, req.query));
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
        ':projectid': 'integer',
        ':instanceid': 'integer',
        res: 'res.Instance.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const instance = await Instance.has_auth(config, req.auth, req.params.projectid, req.params.instanceid);

            return res.json(instance.serialize());
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
     * @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
     */
    await schema.get('/instance/:instanceid', {
        ':instanceid': 'integer',
        res: 'res.Instance.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            const instance = await Instance.from(config, req.auth, req.params.instanceid);

            return res.json(instance.serialize());
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
     *
     * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/instance', config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            await Instance.reset(config.pool);

            return res.json({
                status: 200,
                messages: 'Instances Reset'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
