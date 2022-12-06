import Err from '@openaddresses/batch-error';
import Busboy from 'busboy';
import Project from '../lib/types/project.js';
import AOI from '../lib/types/aoi.js';
import Checkpoint from '../lib/types/checkpoint.js';
import AOIPatch from '../lib/types/aoi-patch.js';
import AOIShare from '../lib/types/aoi-share.js';
import Proxy from '../lib/proxy.js';
import User from '../lib/types/user.js';
import { sql } from 'slonik';

export default async function router(schema, config) {
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


        let tj, tiles;
        if (aoi.uuid) {
            const response = await Proxy.request(req, false, config.TileUrl);

            if (response.statusCode !== 200) throw new Err(500, new Error(response.body), 'Could not access upstream tiff');

            tj = response.body;

            // this is a share
            tiles = [
                `/api/share/${aoi.uuid}/tiles/{z}/{x}/{y}`
            ];
        } else {
            const cmap = {};
            for (let i = 0; i < aoi.classes.length; i++) {
                cmap[i] = aoi.classes[i].color;
            }

            req.query.colormap = JSON.stringify(cmap);

            const response = await Proxy.request(req, false, config.TileUrl);

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


    await schema.get('/project/:projectid/aoi/:aoiid', {
        name: 'Get AOI',
        group: 'AOI',
        auth: 'user',
        description: 'Return all information about a given AOI',
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

    await schema.get('/project/:projectid/aoi/:aoiid/tiles', {
        name: 'TileJSON AOI',
        group: 'AOI',
        auth: 'user',
        description: 'Return a TileJSON for a given AOI',
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

    await schema.get('/project/:projectid/aoi/:aoiid/tiles/:z/:x/:y', {
        name: 'Tile AOI',
        group: 'AOI',
        auth: 'user',
        description: 'Return a Tile for a given AOI',
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

            await Proxy.request(req, res, config.TileUrl);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/project/:projectid/aoi/:aoiid/upload', {
        name: 'Upload AOI',
        group: 'AOI',
        auth: 'admin',
        description: 'Upload a new GeoTIFF to the API',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        res: 'res.AOI.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

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

                    const histo = [];
                    for (let i = 0; i <= a.classes.length; i++) {
                        histo[i] = i + 1;
                    }

                    if (!(await a.exists(config))) throw new Err(500, null, 'AOI is not on Azure?!');

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
                        for (let i = 0; i < a.classes.length; i++) {
                            px_stats[i] = (pres.body[0].categories[i] || 0) / totalpx;
                        }
                    } else {
                        console.log('PX_Stats Error:', JSON.stringify(pres.body));
                    }

                    await a.commit({
                        px_stats
                    });

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

    await schema.get('/project/:projectid/aoi/:aoiid/download/raw', {
        name: 'Download Raw AOI',
        group: 'AOI',
        auth: 'admin',
        description: 'Return the AOI Fabric as a GeoTIFF',
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

    await schema.get('/project/:projectid/aoi/:aoiid/download/color', {
        name: 'Download Color AOI',
        group: 'AOI',
        auth: 'user',
        description: 'Return the colourized aoi fabric geotiff - but doesn\'t save it to share page',
        ':projectid': 'integer',
        ':aoiid': 'integer'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            const tiffurl = await a.url(config);

            const cmap = {};
            for (let i = 0; i < a.classes.length; i++) {
                cmap[i] = a.classes[i].color;
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

            await Proxy.request(req, res, config.TileUrl);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/aoi', {
        name: 'List AOIs',
        group: 'AOI',
        auth: 'user',
        description: 'Return all AOIs for a given instance',
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

    await schema.post('/project/:projectid/aoi', {
        name: 'Create AOI',
        group: 'AOI',
        auth: 'admin',
        description: `
            Create a new AOI during an instance
            Note: this is an internal API that is called by the websocket GPU
        `,
        ':projectid': 'integer',
        body: 'req.body.CreateAOI.json',
        res: 'res.AOI.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            req.body.project_id = req.params.projectid;

            const chkpt = await Checkpoint.from(config.pool, req.body.checkpoint_id);
            req.body.classes = chkpt.classes;

            const a = await AOI.from(config.pool, (await AOI.generate(config.pool, req.body)).id);

            return res.json(a.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/project/:projectid/aoi/:aoiid/share', {
        name: 'Create Share',
        group: 'Share',
        auth: 'user',
        description: 'Export an AOI & it\'s patches to share',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        res: 'res.Share.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);
            if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

            const cmap = {};
            for (let i = 0; i < a.classes.length; i++) {
                cmap[i] = a.classes[i].color;
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

    await schema.delete('/project/:projectid/aoi/:aoiid/share/:shareuuid', {
        name: 'Delete Share',
        group: 'Share',
        auth: 'user',
        description: 'Delete a shared AOI',
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
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            return res.json(await AOIShare.list(config.pool, req.params.projectid, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/project/:projectid/aoi/:aoiid', {
        name: 'Delete AOI',
        group: 'AOI',
        auth: 'user',
        description: 'Delete an existing AOI',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

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

    await schema.patch('/project/:projectid/aoi/:aoiid', {
        name: 'Patch AOI',
        group: 'AOI',
        auth: 'user',
        description: 'Update an AOI',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        body: 'req.body.PatchAOI.json',
        res: 'res.AOI.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

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

    await schema.post('/project/:projectid/aoi/:aoiid/stac', {
        name: 'Create STAC',
        group: 'AOI',
        auth: 'user',
        description: 'Post the AOI to the public STAC Catalogue',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        body: 'req.body.CreateStac.json',
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);
            if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

            await config.pool.query(sql`
                SELECT pgstac.upsert_collection(${JSON.stringify({
                    stac_version: "1.0.0",
                    type: "Catalog",
                    id: a.project_id,
                    description: `Project ID: ${a.project_id}`,
                    links: []
                })}::JSONB);
            `)

            await config.pool.query(sql`
                SELECT pgstac.upsert_item(${JSON.stringify({
                    stac_version: "1.0.0",
                    collection: a.project_id,
                    type: "Feature",
                    id: a.id,
                    bbox: a.bounds.bounds,
                    geometry: a.bounds,
                    properties: {
                        datetime: (new Date(a.created)).toISOString(),
                    },
                    links: [],
                    assets: {}
                })}::JSONB);
            `);

            return res.json({
                status: 200,
                message: 'Create STAC Item'
            });
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
            const share = await AOIShare.from(config.pool, req.params.shareuuid);

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
            const a = await AOIShare.from(config.pool, req.params.shareuuid);
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
            const share = await AOIShare.from(config.pool, req.params.shareuuid);
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
            const share = await AOIShare.from(config.pool, req.params.shareuuid);
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
            const share = await AOIShare.from(config.pool, req.params.shareuuid);
            if (!share.storage) throw new Err(404, null, 'AOI has not been uploaded');

            const aoi = await AOI.from(config.pool, share.aoi_id);
            const tiffurl = await aoi.url(config);

            const cmap = {};
            for (let i = 0; i < aoi.classes.length; i++) {
                cmap[i] = aoi.classes[i].color;
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

            await Proxy.request(req, res, config.TileUrl);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

}
