const Err = require('../lib/error');
const { Param } = require('../lib/util');
const Busboy = require('busboy');

async function router(schema, config) {
    const aoi = new (require('../lib/aoi').AOI)(config);
    const proxy = new (require('../lib/proxy').Proxy)(config);
    const aoipatch = new (require('../lib/aoi-patch').AOIPatch)(config);
    const auth = new (require('../lib/auth').Auth)(config);

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/patch List Patches
     * @apiVersion 1.0.0
     * @apiName ListPatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Return all patches for a given API
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "total": 1,
     *       "project_id": 123,
     *       "aoi_id": 123
     *       "patches": [{
     *           "id": 1432,
     *           "storage": true,
     *           "created": "<date>"
     *       }]
     *   }
     */
    await schema.get('/project/:projectid/aoi/:aoiid/patch', {}, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');

            await aoi.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            return res.json(await aoipatch.list(req.params.projectid, req.params.aoiid, req.query));
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
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "storage": true,
     *       "created": "<date>"
     *       "project_id": 1,
     *       "aoi_id": 1
     *   }
     */
    await schema.post('/project/:projectid/aoi/:aoiid/patch', {}, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');

            await aoi.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            return res.json(await aoipatch.create(req.params.projectid, req.params.aoiid));
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
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   true
     */
    await schema.delete('/project/:projectid/aoi/:aoiid/patch/:patchid', {}, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await Param.int(req, 'patchid');

            await aoipatch.has_auth(config.pool, aoi, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);

            return res.json(await aoipatch.delete(req.params.aoiid, req.params.patchid));
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
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "storage": true,
     *       "created": "<date>"
     *       "project_id": 1,
     *       "aoi": 1
     *  }
     */
    await schema.get('/project/:projectid/aoi/:aoiid/patch/:patchid', {}, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await Param.int(req, 'patchid');

            return res.json(await aoipatch.has_auth(config.pool, aoi, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid));
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
     */
    await schema.get('/project/:projectid/aoi/:aoiid/patch/:patchid/tiles', {}, config.requiresAuth, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await Param.int(req, 'patchid');

            const a = await aoipatch.has_auth(config.pool, auth, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);
            if (!a.storage) throw new Err(404, null, 'Patch has not been uploaded');

            const tiffurl = await aoipatch.url(req.params.aoiid, req.params.patchid);

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
    await schema.get('/project/:projectid/aoi/:aoiid/tiles/:z/:x/:y', {}, async (req, res) => {
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
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "storage": true,
     *       "created": "<date>"
     *       "project_id": 1,
     *       "aoi": 1
     *  }
     */
    await schema.post('/project/:projectid/aoi/:aoiid/patch/:patchid/upload', {}, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await Param.int(req, 'patchid');
            await auth.is_admin(req);

            const busboy = new Busboy({ headers: req.headers });

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
