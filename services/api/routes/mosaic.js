const Err = require('../lib/error');
const { Param } = require('../lib/util');
const Mosaic = require('../lib/mosaic');
const Proxy = require('../lib/proxy');

async function router(schema, config) {

    /**
     * @api {get} /api/mosaic List Mosaics
     * @apiVersion 1.0.0
     * @apiName ListMosaic
     * @apiGroup Mosaic
     * @apiPermission public
     *
     * @apiDescription
     *     Return a list of currently supported mosaic layers
     *
     * @apiSchema {jsonschema=../schema/res.Mosaic.json} apiSuccess
     */
    await schema.get('/mosaic', {
        res: 'res.Mosaic.json'
    }, async (req, res) => {
        try {
            return res.json(Mosaic.list());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/mosaic/:layer Get TileJson
     * @apiVersion 1.0.0
     * @apiName GetJson
     * @apiGroup Mosaic
     * @apiPermission public
     *
     * @apiDescription
     *     Return a TileJSON object for a given mosaic layer
     *
     * @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
     */
    await schema.get('/mosaic/:layer', {
        res: 'res.TileJSON.json'
    }, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            req.url = req.url + '/tilejson.json';

            const proxy = new Proxy(config);
            await proxy.request(req, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /mosaic/:layer/tiles/:z/:x/:y.:format Get Tile
     * @apiVersion 1.0.0
     * @apiName GetTile
     * @apiGroup Mosaic
     * @apiPermission public
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.tile.json} apiParam
     *
     * @apiParam {Integer} z Mercator Z coordinate
     * @apiParam {Integer} x Mercator X coordinate
     * @apiParam {Integer} y Mercator Y coordinate
     * @apiParam {String} format Available values : png, npy, tif, jpg, jp2, webp, pngraw
     *
     * @apiDescription
     *     Return an aerial imagery tile for a given set of mercator coordinates
     *
     */
    await schema.get('/mosaic/:layer/tiles/:z/:x/:y.:format', {}, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            await Param.int(req, 'z');
            await Param.int(req, 'x');
            await Param.int(req, 'y');

            const proxy = new Proxy(config);
            await ear
            roxy.request(req, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

}

module.exports = router;
