import Busboy from 'busboy';
import Err from '@openaddresses/batch-error';
import Model from '../lib/types/model.js';
import OSMTag from '../lib/types/osmtag.js';
import User from '../lib/types/user.js';

export default async function router(schema, config) {

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
            await User.is_admin(req);

            req.body.uid = req.auth.id;

            if (req.body.tagmap) {
                OSMTag.validate(req.body.tagmap, req.body.classes);

                const tagmap = await OSMTag.generate(config.pool, {
                    project_id: null,
                    tagmap: req.body.tagmap
                });

                delete req.body.tagmap;
                req.body.osmtag_id = tagmap.id;
            }

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
        ':modelid': 'integer',
        body: 'req.body.PatchModel.json',
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            const model = await Model.from(config.pool, req.params.modelid);

            if (req.body.tagmap && model.osmtag_id) {
                const tagmap = await OSMTag.from(config.pool, model.osmtag_id);
                tagmap.tagmap = req.body.tagmap;
                await tagmap.commit(config.pool);
                delete req.body.tagmap;
            } else if (req.body.tagmap) {
                const tagmap = await OSMTag.generate(config.pool, {
                    project_id: null,
                    tagmap: req.body.tagmap
                });

                delete req.body.tagmap;
                model.osmtag_id = tagmap.id;
            }

            model.patch(req.body);
            await model.commit(config.pool);

            res.json(model.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/model/:modelid/upload UploadModel
     * @apiVersion 1.0.0
     * @apiName UploadModel
     * @apiGroup Model
     * @apiPermission admin
     *
     * @apiDescription
     *     Upload a new model asset to the API
     *
     * @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
     */
    await schema.post('/model/:modelid/upload', {
        ':modelid': 'integer',
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

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
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListModels.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListModels.json} apiSuccess
     */
    await schema.get('/model', {
        query: 'req.query.ListModels.json',
        res: 'res.ListModels.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            if (req.auth && req.auth.access === 'admin') {
                for (const t of ['active', 'storage']) {
                    if (req.query[t] === 'all') req.query[t] = null;
                    else if (req.query[t] === 'false') req.query[t] = false;
                    else if (req.query[t] === 'true') req.query[t] = true;
                    else req.query[t] = true;
                }
            } else {
                req.query.storage = true;
                req.query.active = true;
            }

            res.json(await Model.list(config.pool, req.query));
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
        ':modelid': 'integer',
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

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
        ':modelid': 'integer',
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const model = await Model.from(config.pool, req.params.modelid);

            if (model.osmtag_id) {
                model.osmtag = [];

                const tagmap = await OSMTag.from(config.pool, model.osmtag_id);
                for (const key of Object.keys(tagmap.tagmap)) {
                    model.osmtag.push({
                        name: model.classes[parseInt(key)].name,
                        tags: tagmap.tagmap[key]
                    });
                }
            }

            return res.json(model.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/model/:modelid/osmtag Get OSMTags
     * @apiVersion 1.0.0
     * @apiName GetOSMTags
     * @apiGroup Model
     * @apiPermission user
     *
     * @apiDescription
     *     Return OSMTags for a Model if they exist
     *
     * @apiSchema {jsonschema=../schema/res.OSMTag.json} apiSuccess
     */
    await schema.get('/model/:modelid/osmtag', {
        ':modelid': 'integer',
        res: 'res.OSMTag.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const model = await Model.from(config.pool, req.params.modelid);

            if (!model.osmtag_id) throw new Err(404, null, 'Model does not have OSMTags');

            const tags = await OSMTag.from(config.pool, model.osmtag_id);

            return res.json(tags.serialize());
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
    await schema.get('/model/:modelid/download', {
        ':modelid': 'integer'
    }, config.requiresAuth, async (req, res) => {
        try {
            const model = await Model.from(config.pool, req.params.modelid);
            await model.download(config, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
