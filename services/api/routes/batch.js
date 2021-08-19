'use strict';

const Err = require('../lib/error');
const Batch = require('../lib/batch');
const { Param } = require('../lib/util');

async function router(schema, config) {
    const project = new (require('../lib/project').Project)(config);

    /**
     * @api {get} /api/project/:projectid/batch List Batch
     * @apiVersion 1.0.0
     * @apiName ListBatch
     * @apiGroup batch
     * @apiPermission user
     *
     * @apiDescription
     *     Return a list of all batches for a given user
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListBatches.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListBatches.json} apiSuccess
     */
    await schema.get('/project/:projectid/batch', {
        query: 'req.query.ListBatches.json',
        res: 'res.ListBatches.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'projectid');

            await project.has_auth(req.auth, req.params.projectid);

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
     * @apiGroup batch
     * @apiPermission user
     *
     * @apiDescription
     *     Create a new batch
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.CreateBatch.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Batch.json} apiSuccess
     */
    await schema.post('/project/:projectid/batch', {
        body: 'req.body.CreateBatch.json',
        res: 'res.Batch.json'
    }, async (req, res) => {
        try {
            await Param.int(req, 'projectid');

            await project.has_auth(req.auth, req.params.projectid);

            req.body.uid = req.auth.uid;
            req.body.project_id = req.params.projectid;
            const batch = await Batch.generate(config.pool, req.body);

            return res.json(batch.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/project/:projectid/batch/:batchid Get Batch
     * @apiVersion 1.0.0
     * @apiName GetBatch
     * @apiGroup batch
     * @apiPermission user
     *
     * @apiDescription
     *     Return a single batch
     *
     * @apiSchema {jsonschema=../schema/res.Batch.json} apiSuccess
     */
    await schema.get('/project/:projectid/batch/:batchid', {
        res: 'res.Batch.json'
    }, async (req, res) => {
        try {
            await user.is_auth(req);
            await Param.int(req, 'projectid');
            await Param.int(req, 'batchid');

            const batch = await Batch.has_auth(project, req.auth, req.params.projectid, req.params.batchid);

            return res.json(batch.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/project/:pid Patch Batch
     * @apiVersion 1.0.0
     * @apiName PatchBatch
     * @apiGroup batch
     * @apiPermission user
     *
     * @apiDescription
     *     Update a project
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchBatch.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Batch.json} apiSuccess
     */
    await schema.patch('/project/:projectid/batch/:batchid', {
        body: 'req.body.PatchBatch.json',
        res: 'res.Batch.json'
    }, async (req, res) => {
        try {
            await user.is_auth(req);
            await Param.int(req, 'projectid');
            await Param.int(req, 'batchid');

            const batch = await Batch.has_auth(project, req.auth, req.params.projectid, req.params.batchid);
            batch.patch(req.body);
            await batch.commit(config.pool);

            return res.json(batch.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
