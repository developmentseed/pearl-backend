import Err from '@openaddresses/batch-error';
import Busboy from 'busboy';
import Project from '../lib/types/project.js';
import AOI from '../lib/types/aoi.js';
import Checkpoint from '../lib/types/checkpoint.js';
import OSMTag from '../lib/types/osmtag.js';
import User from '../lib/types/user.js';

export default async function router(schema, config) {
    await schema.get('/project/:projectid/checkpoint/:checkpointid', {
        name: 'Get Checkpoint',
        group: 'Checkpoints',
        auth: 'user',
        description: 'Return a given checkpoint for a given instance',
        ':projectid': 'integer',
        ':checkpointid': 'integer',
        res: 'res.Checkpoint.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const checkpoint = await Checkpoint.has_auth(config.pool, req);

            return res.json(checkpoint.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/checkpoint/:checkpointid/osmtag', {
        name: 'Get OSMTags',
        group: 'Checkpoints',
        auth: 'user',
        description: 'Return OSMTags for a Checkpoint if they exist',
        ':projectid': 'integer',
        ':checkpointid': 'integer',
        res: 'res.OSMTag.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const checkpoint = await Checkpoint.has_auth(config.pool, req);

            if (!checkpoint.osmtag_id) throw new Err(404, null, 'Checkpoint does not have OSMTags');

            const tags = await OSMTag.from(config.pool, checkpoint.osmtag_id);

            return res.json(tags.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/checkpoint/:checkpointid/tiles', {
        name: 'TileJSON Checkpoint',
        group: 'Checkpoints',
        auth: 'user',
        description: 'Return tilejson for a given Checkpoint',
        ':projectid': 'integer',
        ':checkpointid': 'integer',
        res: 'res.TileJSON.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const c = (await Checkpoint.has_auth(config.pool, req)).serialize();
            if (!c.storage) throw new Err(404, null, 'Checkpoint has not been uploaded');
            if (!c.center || !c.bounds) throw new Err(404, null, 'Checkpoint has no geometries to serve');

            res.json({
                tilejson: '2.2.0',
                name: `checkpoint-${req.params.checkpointid}`,
                version: '1.0.0',
                scheme: 'xyz',
                tiles: [
                    `/project/${req.params.projectid}/checkpoint/${req.params.checkpointid}/tiles/{z}/{x}/{y}.mvt`
                ],
                bounds: c.bounds,
                center: c.center
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/checkpoint/:checkpointid/tiles/:z/:x/:y.mvt', {
        name: 'Tile Checkpoint',
        group: 'Checkpoints',
        auth: 'user',
        description: 'Return a tile for a given Checkpoint',
        ':projectid': 'integer',
        ':checkpointid': 'integer',
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, config.requiresAuth, async (req, res) => {
        try {
            const c = await Checkpoint.has_auth(config.pool, req);
            if (!c.storage) throw new Err(404, null, 'Checkpoint has not been uploaded');
            if (!c.center || !c.bounds) throw new Err(404, null, 'Checkpoint has no geometries to serve');

            return res.send(await c.mvt(config.pool, req.params.z, req.params.x, req.params.y));

        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/project/:projectid/checkpoint/:checkpointid/upload', {
        name: 'Upload Checkpoint',
        group: 'Checkpoints',
        auth: 'admin',
        description: 'Upload a new checkpoint asset to the API',
        ':projectid': 'integer',
        ':checkpointid': 'integer',
        res: 'res.Checkpoint.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            const busboy = new Busboy({
                headers: req.headers,
                limits: {
                    files: 1
                }
            });

            const checkpoint = await Checkpoint.from(config.pool, req.params.checkpointid);

            const files = [];

            busboy.on('file', (fieldname, file) => {
                files.push(checkpoint.upload(config, file));
            });

            busboy.on('finish', async () => {
                try {
                    await Promise.all(files);

                    return res.json(checkpoint.serialize());
                } catch (err) {
                    Err.respond(err, res);
                }
            });

            return req.pipe(busboy);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/checkpoint/:checkpointid/download', {
        name: 'Download Checkpoint',
        group: 'Checkpoints',
        auth: 'user',
        description: 'Download a checkpoint asset from the API',
        ':projectid': 'integer',
        ':checkpointid': 'integer'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req);

            const checkpoint = await Checkpoint.from(config.pool, req.params.checkpointid);
            await checkpoint.download(config, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/checkpoint', {
        name: 'List Checkpoints',
        group: 'Checkpoints',
        auth: 'user',
        description: 'Return all checkpoints for a given instance',
        ':projectid': 'integer',
        query: 'req.query.checkpoint.json',
        res: 'res.ListCheckpoints.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req);

            return res.json(await Checkpoint.list(config.pool, req.params.projectid, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/project/:projectid/checkpoint', {
        name: 'Create Checkpoint',
        group: 'Checkpoints',
        auth: 'admin',
        description: `
            Create a new checkpont during an instance
            Note: this is an internal API that is called by the websocket GPU
        `,
        ':projectid': 'integer',
        body: 'req.body.CreateCheckpoint.json',
        res: 'res.Checkpoint.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req);

            if (req.body.retrain_geoms && req.body.retrain_geoms.length !== req.body.classes.length) {
                throw new Err(400, null, 'retrain_geoms array must be parallel with classes array');
            } else if (!req.body.retrain_geoms) {
                // assuming that if retrain_geoms don't exist, input_geoms also don't exist
                req.body.input_geoms = [];
                req.body.retrain_geoms = req.body.classes.map(() => {
                    req.body.input_geoms.push({ type: 'GeometryCollection', 'geometries': [] });
                    return { type: 'MultiPoint', 'coordinates': [] };
                });
            } else {
                req.body.retrain_geoms = req.body.retrain_geoms.map((e) => {
                    if (!e || e.type !== 'MultiPoint') {
                        req.body.input_geoms.push({ type: 'GeometryCollection', 'geometries': [] });
                        return { type: 'MultiPoint', 'coordinates': [] };
                    }
                    return e;
                });
                req.body.input_geoms = req.body.input_geoms.map((e) => {
                    if (!e || e.type !== 'FeatureCollection') {
                        return { type: 'FeatureCollection', 'features': [] };
                    }
                    return e;
                });
            }

            if (req.body.analytics && req.body.analytics.length !== req.body.analytics.length) {
                throw new Err(400, null, 'analytics array must be parallel with classes array');
            }

            req.body.project_id = req.params.projectid;

            if (req.body.tagmap) {
                OSMTag.validate(req.body.tagmap, req.body.classes);

                const tagmap = await OSMTag.generate(config.pool, {
                    project_id: req.params.projectid,
                    tagmap: req.body.tagmap
                });

                delete req.body.tagmap;
                req.body.osmtag_id = tagmap.id;
            } else {
                req.body.osmtag_id = null;
            }

            const checkpoint = await Checkpoint.generate(config.pool, req.body);

            return res.json(checkpoint.serialize());
        } catch (err) {
            if (String(err.err).match(/ForeignKeyIntegrityConstraintViolationError/)) {
                return Err.respond(new Err(400, null, 'Parent does not exist'), res);
            }
            return Err.respond(err, res);
        }
    });

    await schema.delete('/project/:projectid/checkpoint/:checkpointid', {
        name: 'Delete Checkpoint',
        group: 'Checkpoints',
        auth: 'user',
        description: `
            Delete an existing Checkpoint
            NOTE: This will also delete AOIs that depend on the given checkpoint
        `,
        ':projectid': 'integer',
        ':checkpointid': 'integer',
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const checkpoint = await Checkpoint.has_auth(config.pool, req);

            const aois = await AOI.list(config.pool, req.params.projectid, {
                checkpointid: req.params.checkpointid
            });

            aois.aois.forEach(async (a) => {
                const aoi = await AOI.from(config.pool, a.id);
                await aoi.commit({
                    archived: true
                });
            });

            await checkpoint.commit({
                archived: true
            });

            return res.json({
                status: 200,
                message: 'Checkpoint deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/project/:projectid/checkpoint/:checkpointid', {
        name: 'Patch Checkpoint',
        group: 'Checkpoints',
        auth: 'admin',
        description: 'Update a checkpoint',
        ':projectid': 'integer',
        ':checkpointid': 'integer',
        body: 'req.body.PatchCheckpoint.json',
        res: 'res.Checkpoint.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const checkpoint = await Checkpoint.has_auth(config.pool, req);

            if (req.body.classes && checkpoint.classes.length !== req.body.classes.length) {
                throw new Err(400, null, 'Cannot change the number of classes once a checkpoint is created');
            }

            await checkpoint.commit(req.body);

            return res.json(checkpoint.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
