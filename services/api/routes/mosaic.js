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

            return list;
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/mosaic/:layer', {
        name: 'Get TileJSON',
        group: 'Mosaic',
        auth: 'public',
        description: 'Return a TileJSON object for a given mosaic layer',
        ':layer': 'string',
        res: 'res.TileJSON.json'
    }, async (req, res) => {
        if (!config.PcTileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        req.url = `/api/data/v1/mosaic/${Mosaic.get_id(req.params.layer)}/tilejson.json`;
        req.query = {
            ...Mosaic.get_query(req.params.layer),
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

        req.url = req.url.replace(`/mosaic/${req.params.layer}/tiles/`, `/api/data/v1/mosaic/tiles/${Mosaic.get_id(req.params.layer)}/`);
        req.query = {
            ...Mosaic.get_query(req.params.layer),
            ...req.query
        };

        try {
            Proxy.request(req, res, config.PcTileUrl);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

}
