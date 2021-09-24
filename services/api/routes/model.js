const Busboy = require('busboy');

const Err = require('../lib/error');
const { Param } = require('../lib/util');
const Model = require('../lib/model');

async function router(schema, config) {
    const auth = new (require('../lib/auth').Auth)(config);

    /**
     * @api {post} /api/model Create Model
     * @apiVersion 1.0.0
     * @apiName CreateModel
     * @apiGroup Model
     * @apiPermission admin
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.CreateModel.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
     *
     * @apiDescription
     *     Create a new model in the system
     */
    await schema.post('/model', {
        body: 'req.body.CreateModel.json',
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await auth.is_admin(req);

            req.body.uid = req.auth.uid;
            const model = await Model.generate(config.pool, req.body);

            return res.json(model.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });


    /**
     * @api {patch} /api/model/:modelid Update Model
     * @apiVersion 1.0.0
     * @apiName PatchModel
     * @apiGroup Model
     * @apiPermission admin
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchModel.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
     *
     * @apiDescription
     *     Update a model
     */
    await schema.patch('/model/:modelid', {
        body: 'req.body.PatchModel.json',
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');

            await auth.is_admin(req);

            const model = await Model.from(config.pool, req.params.modelid);
            model.patch(req.body);
            model.commit(config.pool);

            res.json(model.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/model/:modelid/upload UploadModel
     * @apiVersion 1.0.0
     * @apiName UploadModel
     * @apiGroup AOI
     * @apiPermission admin
     *
     * @apiDescription
     *     Upload a new model asset to the API
     *
     * @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
     */
    await schema.post('/model/:modelid/upload', {
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');
            await auth.is_admin(req);

            const busboy = new Busboy({
                headers: req.headers,
                limits: {
                    files: 1
                }
            });

            const model = await Model.from(config.pool, req.params.modelid);

            const files = [];
            busboy.on('file', (fieldname, file) => {
                files.push(model.upload(config, file));
            });

            busboy.on('finish', async () => {
                try {
                    await Promise.all(files);

                    return res.json(model.serialize());
                } catch (err) {
                    Err.respond(err, res);
                }
            });

            return req.pipe(busboy);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/model List Models
     * @apiVersion 1.0.0
     * @apiName ListModel
     * @apiGroup Model
     * @apiPermission user
     *
     * @apiDescription
     *     List information about a set of models
     *
     * @apiSchema {jsonschema=../schema/res.ListModels.json} apiSuccess
     */
    await schema.get('/model', {
        res: 'res.ListModels.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            res.json(await Model.list(config.pool));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {delete} /api/model/:modelid Delete Model
     * @apiVersion 1.0.0
     * @apiName DeleteModel
     * @apiGroup Model
     * @apiPermission user
     *
     * @apiDescription
     *     Mark a model as inactive, and disallow subsequent instances of this model
     *     Note: this will not affect currently running instances of the model
     *
     * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/model/:modelid', {
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');
            await auth.is_admin(req);

            const model = await Model.from(config.pool, req.params.modelid);
            await model.delete(config.pool);

            return res.status(200).json({
                status: 200,
                message: 'Model deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/model/:modelid Get Model
     * @apiVersion 1.0.0
     * @apiName GetModel
     * @apiGroup Model
     * @apiPermission user
     *
     * @apiDescription
     *     Return a all information for a single model
     *
     * @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
     */
    await schema.get('/model/:modelid', {
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');

            const model = await Model.from(config.pool, req.params.modelid);

            return res.json(model.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });


    /**
     * @api {get} /api/model/:modelid/download Download Model
     * @apiVersion 1.0.0
     * @apiName DownloadModel
     * @apiGroup Model
     * @apiPermission user
     *
     * @apiDescription
     *     Return the model itself
     */
    await schema.get('/model/:modelid/download', {}, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');

            const model = await Model.from(config.pool, req.params.modelid);
            await model.download(config, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
