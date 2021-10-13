const Err = require('../lib/error');
const Busboy = require('busboy');
const Project = require('../lib/project');
const AOI = require('../lib/aoi');
const Checkpoint = require('../lib/checkpoint');
const AOIPatch = require('../lib/aoi-patch');
const AOIShare = require('../lib/aoi-share');
const Proxy = require('../lib/proxy');

async function router(schema, config) {
    const auth = new (require('../lib/auth').Auth)(config);

    const getAoiTileJSON = async (aoi, req) => {
        let tiffurl;
        if (aoi.uuid) {
            const a = await AOIShare.from(config.pool, aoi.uuid);
            tiffurl = await a.url(config);
        } else {
            const a = await AOI.from(config.pool, aoi.id);
            tiffurl = await a.url(config);
        }

        req.url = '/cog/tilejson.json';
        req.query.url = tiffurl.origin + tiffurl.pathname;
        req.query.url_params = Buffer.from(tiffurl.search).toString('base64');
        req.query.maxzoom = 20;


        const proxy = new Proxy(config);

        let tj, tiles;
        if (aoi.uuid) {
            const response = await proxy.request(req);

            if (response.statusCode !== 200) throw new Err(500, new Error(response.body), 'Could not access upstream tiff');

            tj = response.body;

            // this is a share
            tiles = [
                `/api/share/${aoi.uuid}/tiles/{z}/{x}/{y}`
            ];
        } else {
            const chkpt = await Checkpoint.from(config.pool, aoi.checkpoint_id);
            const cmap = {};
            for (let i = 0; i < chkpt.classes.length; i++) {
                cmap[i] = chkpt.classes[i].color;
            }

            req.query.colormap = JSON.stringify(cmap);

            const response = await proxy.request(req);

            if (response.statusCode !== 200) throw new Err(500, new Error(response.body), 'Could not access upstream tiff');

            tj = response.body;

            tiles = [
                `/api/project/${req.params.projectid}/aoi/${req.params.aoiid}/tiles/{z}/{x}/{y}?colormap=${encodeURIComponent(JSON.stringify(cmap))}`
            ];
        }

        const aoiTileName = aoi.aoi_id ? `aoi-${aoi.aoi_id}` : `aoi-${aoi.id}`;

        return {
            tilejson: tj.tilejson,
            name: aoiTileName,
            version: tj.version,
            schema: tj.scheme,
            tiles: tiles,
            minzoom: tj.minzoom,
            maxzoom: tj.maxzoom,
            bounds: tj.bounds,
            center: tj.center
        };
    };


    /**
     * @api {get} /api/project/:project/aoi/:aoiid Get AOI
     * @apiVersion 1.0.0
     * @apiName GetAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return all information about a given AOI
     *
     * @apiSchema {jsonschema=../schema/res.ListBatches.json} apiSuccess
     */
    await schema.get('/project/:projectid/aoi/:aoiid', {
        ':projectid': 'integer',
        ':aoiid': 'integer',
        res: 'res.AOI.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            const shares = await AOIShare.list(config.pool, req.params.projectid, {
                aoi_id: a.id
            });

            const a_json = a.serialize();
            a_json.shares = shares.shares;

            return res.json(a_json);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/tiles TileJSON AOI
     * @apiVersion 1.0.0
     * @apiName TileJSONAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return tilejson for a given AOI
     *
     * @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
     */
    await schema.get('/project/:projectid/aoi/:aoiid/tiles', {
        ':projectid': 'integer',
        ':aoiid': 'integer',
        res: 'res.TileJSON.json'
    }, config.requiresAuth, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);
            if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

            res.json(await getAoiTileJSON(a, req));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/tiles/:z/:x/:y Tile AOI
     * @apiVersion 1.0.0
     * @apiName TileAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return a Tile for a given AOI
     */
    await schema.get('/project/:projectid/aoi/:aoiid/tiles/:z/:x/:y', {
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            const tiffurl = await a.url(config);
            req.url = `/cog/tiles/WebMercatorQuad/${req.params.z}/${req.params.x}/${req.params.y}@1x`;
            req.query.url = tiffurl.origin + tiffurl.pathname;
            req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

            const proxy = new Proxy(config);
            await proxy.request(req, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/project/:projectid/aoi/:aoiid/upload Upload AOI
     * @apiVersion 1.0.0
     * @apiName UploadAOI
     * @apiGroup AOI
     * @apiPermission admin
     *
     * @apiDescription
     *     Upload a new GeoTiff to the API
     *
     * @apiSchema {jsonschema=../schema/res.AOI.json} apiSuccess
     */
    await schema.post('/project/:projectid/aoi/:aoiid/upload', {
        ':projectid': 'integer',
        ':aoiid': 'integer',
        res: 'res.AOI.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await auth.is_admin(req);

            const busboy = new Busboy({
                headers: req.headers,
                limits: {
                    files: 1
                }
            });

            const a = await AOI.from(config.pool, req.params.aoiid);

            const files = [];

            busboy.on('file', (fieldname, file) => {
                files.push(a.upload(config, file));
            });

            busboy.on('finish', async () => {
                try {
                    await Promise.all(files);

                    const tiffurl = await a.url(config);

                    const chkpt = await Checkpoint.from(config.pool, a.checkpoint_id);

                    const histo = [];
                    for (let i = 0; i <= chkpt.classes.length; i++) {
                        histo[i] = i + 1;
                    }

                    if (!(await a.exists(config))) throw new Err(500, null, 'AOI is not on Azure?!');

                    const proxy = new Proxy(config);
                    const pres = await proxy.request({
                        url: '/cog/statistics',
                        query: {
                            url: tiffurl.origin + tiffurl.pathname,
                            url_params: Buffer.from(tiffurl.search).toString('base64'),
                            categorical: 'true'
                        },
                        body: {},
                        method: 'GET'
                    }, false);

                    const px_stats = {};

                    if (pres && pres.body && pres.body.length && pres.body[0].valid_pixels) {
                        const totalpx = pres.body[0].valid_pixels;
                        for (let i = 0; i < chkpt.classes.length; i++) {
                            px_stats[i] = (pres.body[0].categories[i] || 0) / totalpx;
                        }
                    } else {
                        console.log('PX_Stats Error:', JSON.stringify(pres.body));
                    }

                    a.patch({
                        px_stats
                    });

                    await a.commit(config.pool);

                    return res.json(a.serialize());
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
     * @api {get} /api/project/:projectid/aoi/:aoiid/download/raw Download Raw AOI
     * @apiVersion 1.0.0
     * @apiName DownloadRawAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return the aoi fabric geotiff
     */
    await schema.get('/project/:projectid/aoi/:aoiid/download/raw', {
        ':projectid': 'integer',
        ':aoiid': 'integer'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            await a.download(config, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:projectid/aoi/:aoiid/download/color Download Color AOI
     * @apiVersion 1.0.0
     * @apiName DownloadColorAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return the colourized aoi fabric geotiff - but doesn't save it to share page
     */
    await schema.get('/project/:projectid/aoi/:aoiid/download/color', {
        ':projectid': 'integer',
        ':aoiid': 'integer'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            const tiffurl = await a.url(config);

            const chkpt = await Checkpoint.from(config.pool, a.checkpoint_id);
            const cmap = {};
            for (let i = 0; i < chkpt.classes.length; i++) {
                cmap[i] = chkpt.classes[i].color;
            }

            const patchurls = [];
            for (const patchid of a.patches) {
                const patch = await AOIPatch.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid, patchid);
                patchurls.push(await patch.url(config));
            }

            req.method = 'POST';
            req.url = '/cog/cogify';

            req.body = {
                input: tiffurl,
                patches: patchurls,
                colormap: cmap
            };

            const proxy = new Proxy(config);
            await proxy.request(req, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:projectid/aoi List AOIs
     * @apiVersion 1.0.0
     * @apiName ListAOIs
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return all aois for a given instance
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.aoi.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListAOIs.json} apiSuccess
     */
    await schema.get('/project/:projectid/aoi', {
        ':projectid': 'integer',
        query: 'req.query.aoi.json',
        res: 'res.ListAOIs.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            const aois = await AOI.list(config.pool, req.params.projectid, req.query);

            for (const a of aois.aois) {
                const shares = await AOIShare.list(config.pool, req.params.projectid, {
                    aoi: a.id
                });

                a.shares = shares.shares;
            }

            return res.json(aois);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/project/:projectid/aoi Create AOI
     * @apiVersion 1.0.0
     * @apiName CreateAOI
     * @apiGroup AOI
     * @apiPermission admin
     *
     * @apiDescription
     *     Create a new AOI during an instance
     *     Note: this is an internal API that is called by the websocket GPU
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.CreateAOI.json} apiParam
     * @apiSchema {jsonschema=../schema/res.AOI.json} apiSuccess
     */
    await schema.post('/project/:projectid/aoi', {
        ':projectid': 'integer',
        body: 'req.body.CreateAOI.json',
        res: 'res.AOI.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            req.body.project_id = req.params.projectid;
            const a = await AOI.generate(config.pool, req.body);

            return res.json(a.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/project/:projectid/aoi/:aoiid/share Create Share
     * @apiVersion 1.0.0
     * @apiName ShareAOI
     * @apiGroup Share
     * @apiPermission user
     *
     * @apiDescription
     *     Export an AOI & it's patches to share
     *
     * @apiSchema {jsonschema=../schema/res.Share.json} apiSuccess
     */
    await schema.post('/project/:projectid/aoi/:aoiid/share', {
        ':projectid': 'integer',
        ':aoiid': 'integer',
        res: 'res.Share.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);
            if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

            const chkpt = await Checkpoint.from(config.pool, a.checkpoint_id);
            const cmap = {};
            for (let i = 0; i < chkpt.classes.length; i++) {
                cmap[i] = chkpt.classes[i].color;
            }

            const patchurls = [];
            for (const patchid of a.patches) {
                const patch = await AOIPatch.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid, patchid);
                patchurls.push(await patch.url(config));
            }

            const share = await AOIShare.generate(config.pool, a);

            if (config.TileUrl) {
                const tiffurl = await a.url(config);
                req.method = 'POST';
                req.url = '/cog/cogify';

                req.body = {
                    input: tiffurl,
                    patches: patchurls,
                    colormap: cmap
                };

                const proxy = new Proxy(config);
                const pres = await proxy.request(req, true);
                const up = await share.upload(config, pres);
                return res.json(up.serialize());
            } else {
                return res.json(share.serialize());
            }
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {delete} /api/project/:projectid/aoi/:aoiid/share/:shareuuid Delete Share
     * @apiVersion 1.0.0
     * @apiName DeleteShare
     * @apiGroup Share
     * @apiPermission user
     *
     * @apiDescription
     *     Delete a Shared AOI
     *
     * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/project/:projectid/aoi/:aoiid/share/:shareuuid', {
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':shareuuid': 'string',
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            const share = await AOIShare.from(config.pool, req.params.shareuuid);
            await share.delete(config);

            return res.json({
                status: 200,
                message: 'AOI Share Deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:projectid/share List Shares
     * @apiVersion 1.0.0
     * @apiName ListShares
     * @apiGroup Share
     * @apiPermission user
     *
     * @apiDescription
     *     Return all shares for a given project
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.Share.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListShare.json} apiSuccess
     */
    await schema.get('/project/:projectid/share', {
        ':projectid': 'integer',
        query: 'req.query.Share.json',
        res: 'res.ListShare.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            return res.json(await AOIShare.list(config.pool, req.params.projectid, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {delete} /api/project/:projectid/aoi/:aoiid Delete AOI
     * @apiVersion 1.0.0
     * @apiName DeleteAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Delete an existing AOI
     *
     * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/project/:projectid/aoi/:aoiid', {
        ':projectid': 'integer',
        ':aoiid': 'integer',
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            await a.delete(config.pool);

            return res.json({
                status: 200,
                message: 'AOI Deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {patch} /api/project/:projectid/aoi/:aoiid Patch AOI
     * @apiVersion 1.0.0
     * @apiName PatchAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Update an AOI
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchAOI.json} apiParam
     * @apiSchema {jsonschema=../schema/res.AOI.json} apiSuccess
     */
    await schema.patch('/project/:projectid/aoi/:aoiid', {
        ':projectid': 'integer',
        ':aoiid': 'integer',
        body: 'req.body.PatchAOI.json',
        res: 'res.AOI.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            a.patch(req.body);
            await a.commit(config.pool);

            return res.json(a.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/share/:shareuuid Get Share
     * @apiVersion 1.0.0
     * @apiName GetShare
     * @apiGroup Share
     * @apiPermission public
     *
     * @apiDescription
     *     Return all information about a given AOI Export using the UUID
     *
     * @apiSchema {jsonschema=../schema/res.Share.json} apiSuccess
     */
    await schema.get('/share/:shareuuid', {
        ':shareuuid': 'string',
        res: 'res.Share.json'
    }, async (req, res) => {
        try {
            const share = await AOIShare.from(config.pool, req.params.shareuuid);

            return res.json(share.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
    /**
     * @api {get} /api/share/:shareuuid/tiles TileJSON
     * @apiVersion 1.0.0
     * @apiName TileJSON
     * @apiGroup Share
     * @apiPermission public
     *
     * @apiDescription
     *     Return tilejson for a given AOI using uuid
     *
     * @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
     */
    await schema.get('/share/:shareuuid/tiles', {
        ':shareuuid': 'string',
        res: 'res.TileJSON.json'
    }, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            const a = await AOIShare.from(config.pool, req.params.shareuuid);
            if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

            res.json(await getAoiTileJSON(a, req));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/share/:shareuuid/tiles/:z/:x/:y Tiles
     * @apiVersion 1.0.0
     * @apiName Tile
     * @apiGroup Share
     * @apiPermission public
     *
     * @apiDescription
     *     Return a Tile for a given AOI using uuid
     */
    await schema.get('/share/:shareuuid/tiles/:z/:x/:y', {
        ':shareuuid': 'string',
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, async (req, res) => {
        try {
            const share = await AOIShare.from(config.pool, req.params.shareuuid);
            const tiffurl = await share.url(config);
            req.url = `/cog/tiles/WebMercatorQuad/${req.params.z}/${req.params.x}/${req.params.y}@1x`;
            req.query.url = tiffurl.origin + tiffurl.pathname;
            req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

            const proxy = new Proxy(config);
            await proxy.request(req, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/share/:shareuuid/download/raw Download Raw AOI
     * @apiVersion 1.0.0
     * @apiName DownloadRawAOI
     * @apiGroup Share
     * @apiPermission public
     *
     * @apiDescription
     *     Return the aoi fabric geotiff
     */
    await schema.get('/share/:shareuuid/download/raw', {
        ':shareuuid': 'string'
    }, async (req, res) => {
        try {
            const share = await AOIShare.from(config.pool, req.params.shareuuid);
            if (!share.storage) throw new Err(404, null, 'AOI has not been uploaded');

            const aoi = await AOI.from(config.pool, share.aoi_id);
            await aoi.download(config, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/share/:shareuuid/download/color Download Color AOI
     * @apiVersion 1.0.0
     * @apiName DownloadColorAOI
     * @apiGroup Share
     * @apiPermission public
     *
     * @apiDescription
     *     Return the colourized aoi fabric geotiff
     */
    await schema.get('/share/:shareuuid/download/color', {
        ':shareuuid': 'string'
    }, async (req, res) => {
        try {
            const share = await AOIShare.from(config.pool, req.params.shareuuid);
            if (!share.storage) throw new Err(404, null, 'AOI has not been uploaded');

            const aoi = await AOI.from(config.pool, share.aoi_id);
            const tiffurl = await aoi.url(config);

            const chkpt = await Checkpoint.from(config.pool, share.checkpoint_id);
            const cmap = {};
            for (let i = 0; i < chkpt.classes.length; i++) {
                cmap[i] = chkpt.classes[i].color;
            }

            const patchurls = [];
            for (const patchid of aoi.patches) {
                const patch = await AOIPatch.from(config.pool, patchid);
                patchurls.push(await patch.url(config));
            }

            req.method = 'POST';
            req.url = '/cog/cogify';

            req.body = {
                input: tiffurl,
                patches: patchurls,
                colormap: cmap
            };

            const proxy = new Proxy(config);
            await proxy.request(req, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

}

module.exports = router;
