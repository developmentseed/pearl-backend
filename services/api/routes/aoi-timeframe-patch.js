import Err from '@openaddresses/batch-error';
import Busboy from 'busboy';
import AOI from '../lib/types/aoi.js';
import AOIPatch from '../lib/types/aoi-timeframe-patch.js';
import Proxy from '../lib/proxy.js';
import User from '../lib/types/user.js';

export default async function router(schema, config) {
    await schema.get('/project/:projectid/aoi/:aoiid/patch', {
        name: 'List Patches',
        group: 'AOIPatch',
        auth: 'user',
        description: 'Return all patches for a given API',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        query: 'req.query.ListPatches.json',
        res: 'res.ListPatches.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            return res.json(await AOIPatch.list(config.pool, req.params.projectid, req.params.aoiid, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/project/:projectid/aoi/:aoiid/patch', {
        name: 'Create Patch',
        group: 'AOIPatch',
        auth: 'user',
        description: 'Create a new patch',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        body: 'req.body.CreatePatch.json',
        res: 'res.Patch.json'
    }, config.requiresAuth, async (req, res) => {
        try {
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

    await schema.delete('/project/:projectid/aoi/:aoiid/patch/:patchid', {
        name: 'Delete Patch',
        group: 'AOIPatch',
        auth: 'user',
        description: 'Delete a given patch',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':patchid': 'integer',
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
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

    await schema.get('/project/:projectid/aoi/:aoiid/patch/:patchid', {
        name: 'Get Patch',
        group: 'AOIPatch',
        auth: 'user',
        description: 'Get a specific patch',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':patchid': 'integer',
        res: 'res.Patch.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const patch = await AOIPatch.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);

            return res.json(patch.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/aoi/:aoiid/patch/:patchid/tiles', {
        name: 'TileJSON Patch',
        group: 'AOIPatch',
        auth: 'user',
        description: 'Get the TileJSON for a given AOI Patch',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':patchid': 'integer',
        res: 'res.TileJSON.json'
    }, config.requiresAuth, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            const a = await AOIPatch.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);
            const tiffurl = await a.url(config);

            req.url = '/cog/tilejson.json';
            req.query.url = tiffurl.origin + tiffurl.pathname;
            req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

            const response = await Proxy.request(req, false, config.TileUrl);

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

    await schema.get('/project/:projectid/aoi/:aoiid/patch/:patchid/tiles/:z/:x/:y', {
        name: 'Tile Patch',
        group: 'AOIPatch',
        auth: 'user',
        description: 'Return a Tile for a given AOI Patch',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':patchid': 'integer',
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, async (req, res) => {
        try {
            const a = await AOIPatch.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);

            const tiffurl = await a.url(config);
            req.url = `/cog/tiles/WebMercatorQuad/${req.params.z}/${req.params.x}/${req.params.y}@1x`;
            req.query.url = tiffurl.origin + tiffurl.pathname;
            req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

            await Proxy.request(req, res, config.TileUrl);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/aoi/:aoiid/patch/:patchid/download', {
        name: 'Download Patch',
        group: 'AOIPatch',
        auth: 'user',
        description: 'Download a Tiff Patch',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':patchid': 'integer'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOIPatch.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);

            await a.download(config, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/project/:projectid/aoi/:aoiid/patch/:patchid/upload', {
        name: 'Upload Patch',
        group: 'AOIPatch',
        auth: 'admin',
        description: 'Upload a new AOI Patch asset to the API',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        ':patchid': 'integer',
        res: 'res.Patch.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            const busboy = new Busboy({
                headers: req.headers,
                limits: {
                    files: 1
                }
            });

            const files = [];
            const patch = await AOIPatch.from(config.pool, req.params.patchid);

            busboy.on('file', (fieldname, file) => {
                files.push(patch.upload(config, file));
            });

            busboy.on('finish', async () => {
                await Promise.all(files);

                try {
                    return res.json(patch.serialize());
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
