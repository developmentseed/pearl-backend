import Err from '@openaddresses/batch-error';
import Mosaic from '../lib/types/mosaic.js';
import Proxy from '../lib/proxy.js';

export default async function router(schema, config) {
    await schema.get('/mosaic', {
        name: 'List Mosaics',
        group: 'Mosaic',
        auth: 'public',
        description: 'Return a list of currently supported mosaic layers',
        res: 'res.Mosaic.json'
    }, async (req, res) => {
        try {
            const list = await Mosaic.list(config.pool);

            list.mosaics = list.mosaics.map((mosaic) => {
                return mosaic.name;
            });

            return res.json(list);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/mosaic/:mosaic', {
        name: 'Get TileJSON',
        group: 'Mosaic',
        auth: 'public',
        description: 'Return a TileJSON object for a given mosaic layer',
        ':mosaic': 'string',
        res: 'res.TileJSON.json'
    }, async (req, res) => {
        if (!config.PcTileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        const mosaic = await Mosaic.from(config.pool, req.params.mosaic);
        req.url = `/api/data/v1/mosaic/${mosaic.id}/tilejson.json`;
        req.query = {
            ...mosaic.params,
            ...req.query
        };

        try {
            await Proxy.request(req, res, config.PcTileUrl);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/mosaic/:layer/tiles/:z/:x/:y.:format', {
        name: 'Get Tile',
        group: 'Mosaic',
        auth: 'public',
        description: 'Return an aerial imagery tile for a given set of mercator coordinates',
        ':layer': 'string',
        ':format': 'string',
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, async (req, res) => {
        if (!config.PcTileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        const mosaic = await Mosaic.from(config.pool, req.params.mosaic);
        req.url = req.url.replace(`/mosaic/${req.params.layer}/tiles/`, `/api/data/v1/mosaic/tiles/${mosaic.id}/`);
        req.query = {
            ...mosaic.params,
            ...req.query
        };

        try {
            Proxy.request(req, res, config.PcTileUrl);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

}
