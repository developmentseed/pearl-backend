const { Err } = require('@openaddresses/batch-schema');
const Batch = require('../lib/batch');
const Project = require('../lib/project');
const Instance = require('../lib/instance');
const Checkpoint = require('../lib/checkpoint');

async function router(schema, config) {

    /**
     * @api {get} /api/project/:projectid/batch List Batch
     * @apiVersion 1.0.0
     * @apiName ListBatch
     * @apiGroup Batch
     * @apiPermission user
     *
     * @apiDescription
     *     Return a list of all batches for a given user
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListBatches.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListBatches.json} apiSuccess
     */
    await schema.get('/project/:projectid/batch', {
        ':projectid': 'integer',
        query: 'req.query.ListBatches.json',
        res: 'res.ListBatches.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            req.query.uid = req.auth.uid;
            req.query.projectid = req.params.projectid;
            res.json(await Batch.list(config.pool, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/project/:projectid/batch Create Batch
     * @apiVersion 1.0.0
     * @apiName CreateBatch
     * @apiGroup Batch
     * @apiPermission user
     *
     * @apiDescription
     *     Create a new batch
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.CreateBatch.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Batch.json} apiSuccess
     */
    await schema.post('/project/:projectid/batch', {
        ':projectid': 'integer',
        body: 'req.body.CreateBatch.json',
        res: 'res.Batch.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            const existing_batch = await Instance.list(config.pool, req.params.projectid, {
                batch: true,
                status: 'active'
            });

            if (existing_batch.total > 0) {
                throw new Err(400, null, 'Failed to update Instance, there is already an active batch instance');
            }

            if (req.body.checkpoint_id) {
                await Checkpoint.has_auth(config.pool, req.auth, req.params.projectid, req.body.checkpoint_id);
            }

            req.body.uid = req.auth.uid;
            req.body.project_id = req.params.projectid;
            const batch = await Batch.generate(config.pool, req.body);

            req.body.project_id = req.params.projectid;
            req.body.batch = batch.id;


            req.body.uid = req.auth.uid;
            const inst = await Instance.generate(config, req.body);

            const batch_json = batch.serialize();
            batch_json.instance = inst.id;

            return res.json(batch_json);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:projectid/batch/:batchid Get Batch
     * @apiVersion 1.0.0
     * @apiName GetBatch
     * @apiGroup Batch
     * @apiPermission user
     *
     * @apiDescription
     *     Return a single batch
     *
     * @apiSchema {jsonschema=../schema/res.Batch.json} apiSuccess
     */
    await schema.get('/project/:projectid/batch/:batchid', {
        ':projectid': 'integer',
        ':batchid': 'integer',
        res: 'res.Batch.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const batch = await Batch.has_auth(config.pool, req.auth, req.params.projectid, req.params.batchid);

            return res.json(batch.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/project/:projectid/batch/:batchid Patch Batch
     * @apiVersion 1.0.0
     * @apiName PatchBatch
     * @apiGroup Batch
     * @apiPermission user
     *
     * @apiDescription
     *     Update a project
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchBatch.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Batch.json} apiSuccess
     */
    await schema.patch('/project/:projectid/batch/:batchid', {
        ':projectid': 'integer',
        ':batchid': 'integer',
        body: 'req.body.PatchBatch.json',
        res: 'res.Batch.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const batch = await Batch.has_auth(config.pool, req.auth, req.params.projectid, req.params.batchid);
            batch.patch(req.body);
            await batch.commit(config.pool);

            return res.json(batch.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
