'use strict';

const Err = require('../lib/error');
const { Param } = require('../lib/util');
const Mosaic = require('../lib/mosaic');

async function router(schema, config) {
    const project = new (require('../lib/project').Project)(config);
    const model = new (require('../lib/model').Model)(config);
    const auth = new (require('../lib/auth').Auth)(config);

    /**
     * @api {post} /api/model Create Model
     * @apiVersion 1.0.0
     * @apiName CreateModel
     * @apiGroup Model
     * @apiPermission admin
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.model.json} apiParam
     * @apiSchema {jsonschema=./schema/res.Model.json} apiSuccess
     *
     * @apiDescription
     *     Create a new model in the system
     */
    await schema.post('/model', {
        body: 'req.body.model.json',
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await auth.is_admin(req);

            res.json(await model.create(req.body, req.auth));
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
     * @apiSchema (Body) {jsonschema=./schema/req.body.model-patch.json} apiParam
     * @apiSchema {jsonschema=./schema/res.Model.json} apiSuccess
     *
     * @apiDescription
     *     Update a model
     */
    await schema.patch('/model/:modelid', {
        body: 'req.body.model-patch.json',
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');

            await auth.is_admin(req);

            res.json(await model.patch(req.params.modelid, req.body));
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
     * @apiSchema {jsonschema=./schema/res.Model.json} apiSuccess
     */
    await schema.post('/model/:modelid/upload', {
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');
            await auth.is_admin(req);

            await model.get(req.params.modelid);

            const busboy = new Busboy({ headers: req.headers });

            const files = [];

            busboy.on('file', (fieldname, file) => {
                files.push(model.upload(req.params.modelid, file));
            });

            busboy.on('finish', async () => {
                try {
                    return res.json(await model.get(req.params.modelid));
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
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "models": [{
     *           "id": 1,
     *           "created": "<date>",
     *           "active": true,
     *           "name": "NA Model"
     *       }]
     *   }
     */
    await schema.get('/model', {}, config.requiresAuth, async (req, res) => {
        try {
            res.json(await model.list());
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
     * @apiSchema {jsonschema=./schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/model/:modelid', {
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');
            await auth.is_admin(req);

            await model.delete(req.params.modelid);

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
     * @apiSchema {jsonschema=./schema/res.Model.json} apiSuccess
     */
    await schema.get('/model/:modelid', {
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');

            res.json(await model.get(req.params.modelid));
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

            await model.download(req.params.modelid, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    }); 
}

module.exports = router;
