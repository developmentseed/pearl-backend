import Err from '@openaddresses/batch-error';
import Busboy from 'busboy';
import Project from '../lib/types/project.js';
import AOI from '../lib/types/aoi.js';
import TimeFrame from '../lib/types/aoi-timeframe.js';
import Checkpoint from '../lib/types/checkpoint.js';
import TimeFramePatch from '../lib/types/aoi-timeframe-patch.js';
import TimeFrameShare from '../lib/types/aoi-timeframe-share.js';
import Proxy from '../lib/proxy.js';
import User from '../lib/types/user.js';
import { sql } from 'slonik';
import Mosaic from '../lib/types/mosaic.js';

export default async function router(schema, config) {
    const getAoiTileJSON = async (timeframe, req) => {
        let tiffurl;
        if (timeframe.uuid) {
            const tf = await TimeFrameShare.from(config.pool, timeframe.uuid);
            tiffurl = await tf.url(config);
        } else {
            const tf = await TimeFrame.from(config.pool, timeframe.id);
            tiffurl = await tf.url(config);
        }

        req.url = '/cog/tilejson.json';
        req.query.url = tiffurl.origin + tiffurl.pathname;
        req.query.url_params = Buffer.from(tiffurl.search).toString('base64');
        req.query.maxzoom = 20;


        let tj, tiles;
        if (timeframe.uuid) {
            const response = await Proxy.request(req, false, config.TileUrl);

            if (response.statusCode !== 200) throw new Err(500, new Error(response.body), 'Could not access upstream tiff');

            tj = response.body;

            // this is a share
            tiles = [
                `/api/share/${timeframe.uuid}/tiles/{z}/{x}/{y}`
            ];
        } else {
            const cmap = {};
            for (let i = 0; i < timeframe.classes.length; i++) {
                cmap[i] = timeframe.classes[i].color;
            }

            req.query.colormap = JSON.stringify(cmap);

            const response = await Proxy.request(req, false, config.TileUrl);

            if (response.statusCode !== 200) throw new Err(500, new Error(response.body), 'Could not access upstream tiff');

            tj = response.body;

            tiles = [
                `/api/project/${req.params.projectid}/aoi/${req.params.aoiid}/tiles/{z}/{x}/{y}?colormap=${encodeURIComponent(JSON.stringify(cmap))}`
            ];
        }

        const aoiTileName = timeframe.aoi_id ? `aoi-${timeframe.aoi_id}` : `aoi-${timeframe.id}`;

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


    await schema.get('/project/:projectid/aoi/:aoiid/timeframe/:timeframeid', {
        name: 'Get Timeframe',
        group: 'TimeFrame',
        auth: 'user',
        description: 'Return all information about a given AOI Timeframe',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':timeframeid': 'integer',
        res: 'res.TimeFrame.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const tf = await TimeFrame.has_auth(config.pool, req);

            const shares = await TimeFrameShare.list(config.pool, req.params.projectid, {
                aoi_id: tf.id
            });

            const tf_json = tf.serialize();
            tf_json.shares = shares.shares;

            return res.json(tf_json);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/tiles', {
        name: 'TileJSON',
        group: 'TimeFrame',
        auth: 'user',
        description: 'Return a TileJSON for a given AOI TimeFrame',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':timeframeid': 'integer',
        res: 'res.TileJSON.json'
    }, config.requiresAuth, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            const tf = await TimeFrame.has_auth(config.pool, req);
            if (!tf.storage) throw new Err(404, null, 'AOI TimeFrame has not been uploaded');

            res.json(await getAoiTileJSON(tf, req));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/tiles/:z/:x/:y', {
        name: 'Tiles',
        group: 'TimeFrame',
        auth: 'user',
        description: 'Return a Tile for a given AOI TimeFrame',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':timeframeid': 'integer',
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, config.requiresAuth, async (req, res) => {
        try {
            const tf = await TimeFrame.has_auth(config.pool, req);

            const tiffurl = await tf.url(config);
            req.url = `/cog/tiles/WebMercatorQuad/${req.params.z}/${req.params.x}/${req.params.y}@1x`;
            req.query.url = tiffurl.origin + tiffurl.pathname;
            req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

            await Proxy.request(req, res, config.TileUrl);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/upload', {
        name: 'Upload TimeFrame',
        group: 'TimeFrame',
        auth: 'admin',
        description: 'Upload a new GeoTIFF to the API',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':timeframeid': 'integer',
        res: 'res.TimeFrame.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            const busboy = new Busboy({
                headers: req.headers,
                limits: {
                    files: 1
                }
            });

            const tf = await TimeFrame.from(config.pool, req.params.timeframeid);

            const files = [];

            busboy.on('file', (fieldname, file) => {
                files.push(tf.upload(config, file));
            });

            busboy.on('finish', async () => {
                try {
                    await Promise.all(files);

                    const tiffurl = await tf.url(config);

                    const histo = [];
                    for (let i = 0; i <= tf.classes.length; i++) {
                        histo[i] = i + 1;
                    }

                    if (!(await tf.exists(config))) throw new Err(500, null, 'TimeFrame is not on Azure?!');

                    const pres = await Proxy.request({
                        url: '/cog/statistics',
                        query: {
                            url: tiffurl.origin + tiffurl.pathname,
                            url_params: Buffer.from(tiffurl.search).toString('base64'),
                            categorical: 'true'
                        },
                        body: {},
                        method: 'GET'
                    }, false, config.TileUrl);

                    const px_stats = {};

                    if (pres && pres.body && pres.body.length && pres.body[0].valid_pixels) {
                        const totalpx = pres.body[0].valid_pixels;
                        for (let i = 0; i < tf.classes.length; i++) {
                            px_stats[i] = (pres.body[0].categories[i] || 0) / totalpx;
                        }
                    } else {
                        console.log('PX_Stats Error:', JSON.stringify(pres.body));
                    }

                    await tf.commit({ px_stats });

                    return res.json(tf);
                } catch (err) {
                    Err.respond(err, res);
                }
            });

            return req.pipe(busboy);
        } catch (err) {
            console.error(err);
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/download/raw', {
        name: 'Download Raw TimeFrame',
        group: 'TimeFrame',
        auth: 'admin',
        description: 'Return the TimeFrame Fabric as a GeoTIFF',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':timeframeid': 'integer'
    }, config.requiresAuth, async (req, res) => {
        try {
            const tf = await TimeFrame.has_auth(config.pool, req);
            await tf.download(config, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/download/color', {
        name: 'Download Color TimeFrame',
        group: 'TimeFrame',
        auth: 'user',
        description: 'Return the colourized aoi fabric geotiff - but doesn\'t save it to share page',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':timeframeid': 'integer'
    }, config.requiresAuth, async (req, res) => {
        try {
            const tf = await TimeFrame.has_auth(config.pool, req);

            const tiffurl = await tf.url(config);

            const cmap = {};
            for (let i = 0; i < tf.classes.length; i++) {
                cmap[i] = tf.classes[i].color;
            }

            const patchurls = [];
            for (const patchid of tf.patches) {
                req.params.patchid = patchid;
                const patch = await TimeFramePatch.has_auth(config.pool, req);
                patchurls.push(await patch.url(config));
            }

            req.method = 'POST';
            req.url = '/cog/cogify';

            req.body = {
                input: tiffurl,
                patches: patchurls,
                colormap: cmap
            };

            await Proxy.request(req, res, config.TileUrl);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/aoi/:aoiid/timeframe', {
        name: 'List TimeFrames',
        group: 'TimeFrame',
        auth: 'user',
        description: 'Return all TimeFrames for a given instance',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        query: 'req.query.timeframe.json',
        res: 'res.ListTimeFrames.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req);

            const list = await TimeFrame.list(config.pool, req.params.aoiid, req.query);

            // TODO this should be a join
            for (const tf of list.timeframes) {
                const shares = await TimeFrameShare.list(config.pool, req.params.projectid, {
                    aoi: a.id
                });

                tf.shares = shares.shares;
            }

            list.project_id = req.params.projectid;
            list.aoi_id = req.params.aoiid;

            return res.json(list);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/project/:projectid/aoi/:aoiid/timeframe', {
        name: 'Create TimeFrame',
        group: 'TimeFrame',
        auth: 'admin',
        description: `
            Create a new AOI during an instance
            Note: this is an internal API that is called by the websocket GPU
        `,
        ':projectid': 'integer',
        ':aoiid': 'integer',
        body: 'req.body.CreateTimeFrame.json',
        res: 'res.TimeFrame.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await AOI.has_auth(config.pool, req);

            try {
                await Mosaic.from(config.pool, req.body.mosaic, {
                    column: 'name'
                });
            } catch (err) {
                try {
                    await Mosaic.from(config.pool, req.body.mosaic, {
                        column: 'id'
                    });
                } catch (err) {
                    console.error(err);
                    throw new Err(400, null, 'Invalid Mosaic');
                }
            }

            req.body.aoi_id = req.params.aoiid;

            const chkpt = await Checkpoint.from(config.pool, req.body.checkpoint_id);
            req.body.classes = chkpt.classes;

            return res.json(await TimeFrame.generate(config.pool, req.body));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/share', {
        name: 'Create Share',
        group: 'Share',
        auth: 'user',
        description: 'Export an AOI & it\'s patches to share',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':timeframeid': 'integer',
        res: 'res.Share.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const tf = await TimeFrame.has_auth(config.pool, req);
            if (!tf.storage) throw new Err(404, null, 'AOI has not been uploaded');

            const cmap = {};
            for (let i = 0; i < tf.classes.length; i++) {
                cmap[i] = tf.classes[i].color;
            }

            const patchurls = [];
            for (const patchid of tf.patches) {
                req.params.patchid = patchid;
                const patch = await TimeFramePatch.has_auth(config.pool, req);
                patchurls.push(await patch.url(config));
            }

            const a = await AOI.from(config.pool, req.params.aoiid);
            const share = await TimeFrameShare.generate(config.pool, {
                project_id: req.params.projectid,
                aoi_id: req.params.aoiid,
                timeframe_id: req.params.timeframeid,
                bounds: a.bounds,
                patches: tf.patches
            });

            if (config.TileUrl) {
                const tiffurl = await tf.url(config);
                req.method = 'POST';
                req.url = '/cog/cogify';

                req.body = {
                    input: tiffurl,
                    patches: patchurls,
                    colormap: cmap
                };

                const pres = await Proxy.request(req, true, config.TileUrl);
                const up = await share.upload(config, pres);
                return res.json(up.serialize());
            } else {
                return res.json(share.serialize());
            }
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/share/:shareuuid', {
        name: 'Delete Share',
        group: 'Share',
        auth: 'user',
        description: 'Delete a shared AOI',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':timeframeid': 'integer',
        ':shareuuid': 'string',
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await TimeFrame.has_auth(config.pool, req);

            const share = await TimeFrameShare.from(config.pool, req.params.shareuuid);
            await share.delete(config);

            return res.json({
                status: 200,
                message: 'AOI Share Deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/share', {
        name: 'List Shares',
        group: 'Share',
        auth: 'user',
        description: 'Return all shares for a given project',
        ':projectid': 'integer',
        query: 'req.query.Share.json',
        res: 'res.ListShare.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req);

            const list = await TimeFrameShare.list(config.pool, req.params.projectid, req.query);
            list.project_id = req.params.projectid;
            return res.json(list);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/project/:projectid/aoi/:aoiid/timeframe/:timeframeid', {
        name: 'Delete AOI',
        group: 'TimeFrame',
        auth: 'user',
        description: 'Delete an existing AOI',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':timeframeid': 'integer',
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await TimeFrame.has_auth(config.pool, req);

            await a.commit({
                archived: true
            });

            return res.json({
                status: 200,
                message: 'AOI Deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/project/:projectid/aoi/:aoiid/timeframe/:timeframeid', {
        name: 'Patch AOI',
        group: 'TimeFrame',
        auth: 'user',
        description: 'Update an TimeFrame',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':timeframeid': 'integer',
        body: 'req.body.PatchTimeFrame.json',
        res: 'res.TimeFrame.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await TimeFrame.has_auth(config.pool, req);

            if (req.body.classes && req.body.classes.length !== a.classes.length) {
                throw new Err(400, null, 'Cannot change number of classes on an existing AOI');
            }

            if (req.body.bookmarked && !a.bookmarked_at) {
                req.body.bookmarked_at = sql`NOW()`;
            } else if (req.body.bookmarked === false) {
                req.body.bookmarked_at = sql`NULL`;
            }

            await a.commit(req.body);
            return res.json(a);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/share/:shareuuid', {
        name: 'Get Share',
        group: 'Share',
        auth: 'public',
        description: 'Return all information about a given AOI Export using the UUID',
        ':shareuuid': 'string',
        res: 'res.Share.json'
    }, async (req, res) => {
        try {
            const share = await TimeFrameShare.from(config.pool, req.params.shareuuid);

            const json = share.serialize();
            json.checkpoint_id = share.checkpoint_id;
            json.classes = share.classes;

            return res.json(json);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/share/:shareuuid/tiles', {
        name: 'TileJSON',
        group: 'Share',
        auth: 'public',
        description: 'Return tilejson for a given AOI using uuid',
        ':shareuuid': 'string',
        res: 'res.TileJSON.json'
    }, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            const a = await TimeFrameShare.from(config.pool, req.params.shareuuid);
            if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

            res.json(await getAoiTileJSON(a, req));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/share/:shareuuid/tiles/:z/:x/:y', {
        name: 'Tiles',
        group: 'Share',
        auth: 'public',
        description: 'Return a Tile for a given AOI using uuid',
        ':shareuuid': 'string',
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, async (req, res) => {
        try {
            const share = await TimeFrameShare.from(config.pool, req.params.shareuuid);
            const tiffurl = await share.url(config);
            req.url = `/cog/tiles/WebMercatorQuad/${req.params.z}/${req.params.x}/${req.params.y}@1x`;
            req.query.url = tiffurl.origin + tiffurl.pathname;
            req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

            await Proxy.request(req, res, config.TileUrl);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/share/:shareuuid/download/raw', {
        name: 'Download Raw AOI',
        group: 'Share',
        auth: 'public',
        description: 'Return the aoi fabric geotiff',
        ':shareuuid': 'string'
    }, async (req, res) => {
        try {
            const share = await TimeFrameShare.from(config.pool, req.params.shareuuid);
            if (!share.storage) throw new Err(404, null, 'AOI has not been uploaded');

            const aoi = await AOI.from(config.pool, share.aoi_id);
            await aoi.download(config, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/share/:shareuuid/download/color', {
        name: 'Download Color AOI',
        group: 'Share',
        auth: 'public',
        description: 'Return the colourized aoi fabric geotiff',
        ':shareuuid': 'string'
    }, async (req, res) => {
        try {
            const share = await TimeFrameShare.from(config.pool, req.params.shareuuid);
            if (!share.storage) throw new Err(404, null, 'AOI has not been uploaded');

            const aoi = await AOI.from(config.pool, share.aoi_id);
            const tiffurl = await aoi.url(config);

            const cmap = {};
            for (let i = 0; i < aoi.classes.length; i++) {
                cmap[i] = aoi.classes[i].color;
            }

            const patchurls = [];
            for (const patchid of aoi.patches) {
                const patch = await TimeFramePatch.from(config.pool, patchid);
                patchurls.push(await patch.url(config));
            }

            req.method = 'POST';
            req.url = '/cog/cogify';

            req.body = {
                input: tiffurl,
                patches: patchurls,
                colormap: cmap
            };

            await Proxy.request(req, res, config.TileUrl);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/timeframe/:timeframeid', {
        name: 'Machine Timeframe',
        group: 'TimeFrame',
        auth: 'user',
        description: 'Get a TimeFrame without any top level ids - Only an admin can access this endpoint',
        ':timeframeid': 'integer',
        res: 'res.TimeFrame.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            return res.json(await TimeFrame.from(config.pool, req.params.timeframeid));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
