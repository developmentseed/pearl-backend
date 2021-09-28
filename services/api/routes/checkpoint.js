const Err = require('../lib/error');
const { Param } = require('../lib/util');
const Busboy = require('busboy');
const Project = require('../lib/project');
const AOI = require('../lib/aoi');
const Checkpoint = require('../lib/checkpoint');

async function router(schema, config) {
    const auth = new (require('../lib/auth').Auth)(config);

    /**
     * @api {get} /api/project/:projectid/checkpoint/:checkpointid Get Checkpoint
     * @apiVersion 1.0.0
     * @apiName GetCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Return a given checkpoint for a given instance
     *
     * @apiSchema {jsonschema=../schema/res.Checkpoint.json} apiSuccess
     */
    await schema.get('/project/:projectid/checkpoint/:checkpointid', {
        res: 'res.Checkpoint.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'checkpointid');

            const checkpoint = await Checkpoint.has_auth(config.pool, req.auth, req.params.projectid, req.params.checkpointid);

            return res.json(checkpoint.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:project/checkpoint/:checkpointid/tiles TileJSON Checkpoint
     * @apiVersion 1.0.0
     * @apiName TileJSONCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Return tilejson for a given Checkpoint
     *
     * @apiSchema {jsonschema=../schema/res.CheckpointTilejson.json} apiSuccess
     */
    await schema.get('/project/:projectid/checkpoint/:checkpointid/tiles', {
        res: 'res.CheckpointTilejson.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'checkpointid');

            const c = await Checkpoint.has_auth(config.pool, req.auth, req.params.projectid, req.params.checkpointid);
            if (!c.storage) throw new Err(404, null, 'Checkpoint has not been uploaded');
            if (!c.center || !c.bounds) throw new Err(404, null, 'Checkpoint has no geometries to serve');

            res.json({
                tilejson: '2.2.0',
                name: `checkpoint-${req.params.checkpointid}`,
                version: '1.0.0',
                schema: 'xyz',
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

    /**
     * @api {get} /api/project/:project/checkpoint/:checkpointid/tiles/:z/:x/:y.mvt Tile Checkpoint
     * @apiVersion 1.0.0
     * @apiName TileCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Return a Tile for a given AOI
     */
    await schema.get('/project/:projectid/checkpoint/:checkpointid/tiles/:z/:x/:y.mvt', {}, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'checkpointid');
            await Param.int(req, 'z');
            await Param.int(req, 'x');
            await Param.int(req, 'y');

            const c = await Checkpoint.has_auth(config.pool, req.auth, req.params.projectid, req.params.checkpointid);
            if (!c.storage) throw new Err(404, null, 'Checkpoint has not been uploaded');
            if (!c.center || !c.bounds) throw new Err(404, null, 'Checkpoint has no geometries to serve');

            return res.send(await c.mvt(config.pool, req.params.z, req.params.x, req.params.y));

        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/project/:projectid/checkpoint/:checkpointid/upload Upload Checkpoint
     * @apiVersion 1.0.0
     * @apiName UploadCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission admin
     *
     * @apiDescription
     *     Upload a new checkpoint asset to the API
     *
     * @apiSchema {jsonschema=../schema/res.Checkpoint.json} apiSuccess
     */
    await schema.post('/project/:projectid/checkpoint/:checkpointid/upload', {
        res: 'res.Checkpoint.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'checkpointid');
            await auth.is_admin(req);

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

    /**
     * @api {get} /api/project/:projectid/checkpoint/:checkpointid/download Download Checkpoint
     * @apiVersion 1.0.0
     * @apiName DownloadCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Download a checkpoint asset from the API
     */
    await schema.get('/project/:projectid/checkpoint/:checkpointid/download', {}, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'checkpointid');
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            const checkpoint = await Checkpoint.from(config.pool, req.params.checkpointid);
            await checkpoint.download(config, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:projectid/checkpoint List Checkpoints
     * @apiVersion 1.0.0
     * @apiName ListCheckpoints
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Return all checkpoints for a given instance
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.checkpoint.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListCheckpoints.json} apiSuccess
     */
    await schema.get('/project/:projectid/checkpoint', {
        query: 'req.query.checkpoint.json',
        res: 'res.ListCheckpoints.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            return res.json(await Checkpoint.list(config.pool, req.params.projectid, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/project/:projectid/checkpoint Create Checkpoint
     * @apiVersion 1.0.0
     * @apiName CreateCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission admin
     *
     * @apiDescription
     *     Create a new Checkpoint during an instance
     *     Note: this is an internal API that is called by the websocket GPU
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.CreateCheckpoint.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Checkpoint.json} apiSuccess
     */
    await schema.post('/project/:projectid/checkpoint', {
        body: 'req.body.CreateCheckpoint.json',
        res: 'res.Checkpoint.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

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
            const checkpoint = await Checkpoint.generate(config.pool, req.body);

            return res.json(checkpoint.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {delete} /api/project/:projectid/checkpoint/:checkpointid Delete Checkpoint
     * @apiVersion 1.0.0
     * @apiName DeleteCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Delete an existing Checkpoint
     *     NOTE: This will also delete AOIs that depend on the given checkpoint
     *
     * * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/project/:projectid/checkpoint/:checkpointid', {
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'checkpointid');

            const checkpoint = await Checkpoint.has_auth(config.pool, req.auth, req.params.projectid, req.params.checkpointid);

            const aois = await AOI.list(config.pool, req.params.projectid, {
                checkpointid: req.params.checkpointid
            });

            aois.aois.forEach(async (a) => {
                const aoi = await AOI.from(config.pool, a.id);
                await aoi.delete(config.pool);
            });

            await checkpoint.delete(config.pool, req.params.checkpointid);

            return res.json({
                status: 200,
                message: 'Checkpoint deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/project/:projectid/checkpoint/:checkpointid Patch Checkpoint
     * @apiVersion 1.0.0
     * @apiName PatchCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission admin
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.checkpoint-patch.json} apiParam
     *
     * @apiDescription
     *     Update a checkpoint
     *
     * @apiSchema (Query) {jsonschema=../schema/req.body.PatchCheckpoint.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Checkpoint.json} apiSuccess
     */
    await schema.patch('/project/:projectid/checkpoint/:checkpointid', {
        body: 'req.body.PatchCheckpoint.json',
        res: 'res.Checkpoint.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'checkpointid');

            const checkpoint = await Checkpoint.has_auth(config.pool, req.auth, req.params.projectid, req.params.checkpointid);
            checkpoint.patch(req.body);
            await checkpoint.commit(config.pool);

            return res.json(checkpoint.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
