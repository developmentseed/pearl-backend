import Busboy from 'busboy';
import Err from '@openaddresses/batch-error';
import Model from '../lib/types/model.js';
import OSMTag from '../lib/types/osmtag.js';
import User from '../lib/types/user.js';
import poly from '@turf/bbox-polygon';

export default async function router(schema, config) {
    await schema.post('/model', {
        name: 'Create Model',
        group: 'Model',
        auth: 'admin',
        description: 'Create a new model in the system',
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

            if (!req.body.bounds) req.body.bounds = [-180, -90, 180, 90];
            req.body.bounds = poly(req.body.bounds).geometry;

            const model = await Model.generate(config.pool, {
                storage: false,
                ...req.body
            });

            return res.json(model.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });


    await schema.patch('/model/:modelid', {
        name: 'Update Model',
        group: 'Model',
        auth: 'admin',
        description: 'Update a model',
        ':modelid': 'integer',
        body: 'req.body.PatchModel.json',
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            const model = await Model.from(config.pool, req.params.modelid);

            if (req.body.tagmap && model.osmtag_id) {
                await OSMTag.commit(config.pool, model.osmtag_id, {
                    tagmap: req.body.tagmap
                });
                delete req.body.tagmap;
            } else if (req.body.tagmap) {
                const tagmap = await OSMTag.generate(config.pool, {
                    project_id: null,
                    tagmap: req.body.tagmap
                });

                delete req.body.tagmap;
                model.osmtag_id = tagmap.id;
            }

            if (Array.isArray(req.body.bounds)) req.body.bounds = poly(req.body.bounds).geometry;
            await model.commit(req.body);

            res.json(model.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/model/:modelid/upload', {
        name: 'Upload Model',
        group: 'Model',
        auth: 'admin',
        description: 'Upload a new model asset',
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

    await schema.get('/model', {
        name: 'List Models',
        group: 'Model',
        auth: 'user',
        description: 'List information about a set of models',
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

    await schema.delete('/model/:modelid', {
        name: 'Delete Model',
        group: 'Model',
        auth: 'admin',
        description: `
            Mark a model as inactive, and disallow subsequent instances of this model
            Note: this will not affect currently running instances of the model
        `,
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

    await schema.get('/model/:modelid', {
        name: 'Get Model',
        group: 'Model',
        auth: 'user',
        description: 'Return all information about a single model',
        ':modelid': 'integer',
        res: 'res.Model.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const model = (await Model.from(config.pool, req.params.modelid)).serialize();

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

            return res.json(model);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/model/:modelid/osmtag', {
        name: 'Get OSMTags',
        group: 'Model',
        auth: 'user',
        description: 'Return OSMTags for a model if they exist',
        ':modelid': 'integer',
        res: 'res.OSMTag.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const model = await Model.from(config.pool, req.params.modelid);

            if (!model.osmtag_id) throw new Err(404, null, 'Model does not have OSMTags');

            return res.json(await OSMTag.from(config.pool, model.osmtag_id));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/model/:modelid/download', {
        name: 'Download Model',
        group: 'Model',
        auth: 'user',
        description: 'Return the model itself',
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
