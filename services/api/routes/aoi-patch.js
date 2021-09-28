const Err = require('../lib/error');
const { Param } = require('../lib/util');
const Busboy = require('busboy');
const AOI = require('../lib/aoi');
const AOIPatch = require('../lib/aoi-patch');

async function router(schema, config) {
    const proxy = new (require('../lib/proxy').Proxy)(config);
    const auth = new (require('../lib/auth').Auth)(config);

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/patch List Patches
     * @apiVersion 1.0.0
     * @apiName ListPatches
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Return all patches for a given API
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListPatches.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListPatches.json} apiSuccess
     */
    await schema.get('/project/:projectid/aoi/:aoiid/patch', {
        query: 'req.query.ListPatches.json',
        res: 'res.ListPatches.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');

            await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            return res.json(await AOIPatch.list(req.params.projectid, req.params.aoiid, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/project/:project/aoi/:aoiid/patch Create Patch
     * @apiVersion 1.0.0
     * @apiName CreatePatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Create a new Patch
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.CreatePatch.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Patch.json} apiSuccess
     */
    await schema.post('/project/:projectid/aoi/:aoiid/patch', {
        body: 'req.body.CreatePatch.json',
        res: 'res.Patch.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');

            await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            const patch = await AOIPatch.generate(config.pool, {
                project_id: req.params.projectid,
                aoi_id: req.params.aoiid
            });

            return res.json(patch.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {delete} /api/project/:project/aoi/:aoiid/patch/:patchid Delete Patch
     * @apiVersion 1.0.0
     * @apiName DeletePatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Delete a given patch
     *
     * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/project/:projectid/aoi/:aoiid/patch/:patchid', {
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await Param.int(req, 'patchid');

            const patch = await AOIPatch.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);
            await patch.delete(config);

            return res.json({
                status: 200,
                message: 'AOI Patch Deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/patch/:patchid Get Patch
     * @apiVersion 1.0.0
     * @apiName GetPatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Get a specific patch
     *
     * @apiSchema {jsonschema=../schema/res.Patch.json} apiSuccess
     */
    await schema.get('/project/:projectid/aoi/:aoiid/patch/:patchid', {
        res: 'res.Patch.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await Param.int(req, 'patchid');

            const patch = await AOIPatch.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid));

            return res.json(patch.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/patch/:patchid/tiles TileJSON Patch
     * @apiVersion 1.0.0
     * @apiName TileJSONPatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Get the TileJSON for a given AOI Patch
     *
     * @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
     */
    await schema.get('/project/:projectid/aoi/:aoiid/patch/:patchid/tiles', {
        res: 'res.TileJSON.json'
    }, config.requiresAuth, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await Param.int(req, 'patchid');

            const a = await AOIPatch.has_auth(config.pool, auth, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);
            const tiffurl = await a.url(config);

            req.url = '/cog/tilejson.json';
            req.query.url = tiffurl.origin + tiffurl.pathname;
            req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

            const response = await proxy.request(req);

            if (response.statusCode !== 200) throw new Err(500, new Error(response.body), 'Could not access upstream tiff');

            const tj = JSON.parse(response.body);

            // This is verbose as if the upstream JSON response changes
            // and includes the URL in another place, we leak an access cred
            res.json({
                tilejson: tj.tilejson,
                name: `aoi-${req.params.aoiid}-patch-${req.params.patchid}`,
                version: tj.version,
                schema: tj.scheme,
                tiles: [
                    `/api/project/${req.params.projectid}/aoi/${req.params.aoiid}/patch/${req.params.patchid}/tiles/{z}/{x}/{y}`
                ],
                minzoom: tj.minzoom,
                maxzoom: tj.maxzoom,
                bounds: tj.bounds,
                center: tj.center
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/patch/:patchid/tiles/:z/:x/:y Tile Patch
     * @apiVersion 1.0.0
     * @apiName TilePatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Return a Tile for a given AOI Patch
     */
    await schema.get('/project/:projectid/aoi/patch/:aoiid/tiles/:z/:x/:y', {}, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await Param.int(req, 'patchid');
            await Param.int(req, 'z');
            await Param.int(req, 'x');
            await Param.int(req, 'y');

            const a = await aoipatch.has_auth(config.pool, auth, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);
            if (!a.storage) throw new Err(404, null, 'Patch has not been uploaded');

            const tiffurl = await aoipatch.url(req.params.aoiid, req.params.patchid);
            req.url = `/cog/tiles/WebMercatorQuad/${req.params.z}/${req.params.x}/${req.params.y}@1x`;
            req.query.url = tiffurl.origin + tiffurl.pathname;
            req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

            await proxy.request(req, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/patch/:patchid/download Download Patch
     * @apiVersion 1.0.0
     * @apiName DownloadPatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Download a Tiff Patch
     */
    await schema.get('/project/:projectid/aoi/:aoiid/patch/:patchid/download', {}, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await Param.int(req, 'patchid');

            await aoipatch.has_auth(config.pool, auth, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);

            await aoipatch.download(req.params.aoiid, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/project/:projectid/aoi/:aoiid/patch/:patchid/upload Upload Patch
     * @apiVersion 1.0.0
     * @apiName UploadPatch
     * @apiGroup AOIPatch
     * @apiPermission admin
     *
     * @apiDescription
     *     Upload a new AOI Patch asset to the API
     *
     * @apiSchema {jsonschema=../schema/res.Patch.json} apiSuccess
     */
    await schema.post('/project/:projectid/aoi/:aoiid/patch/:patchid/upload', {
        res: 'res.Patch.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await Param.int(req, 'patchid');
            await auth.is_admin(req);

            const busboy = new Busboy({
                headers: req.headers,
                limits: {
                    files: 1
                }
            });

            const files = [];

            busboy.on('file', (fieldname, file) => {
                files.push(aoipatch.upload(req.params.aoiid, req.params.patchid, file));
            });

            busboy.on('finish', async () => {
                try {
                    return res.json(await aoipatch.get(req.params.patchid));
                } catch (err) {
                    Err.respond(err, res);
                }
            });

            return req.pipe(busboy);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
