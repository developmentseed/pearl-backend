'use strict';

const Err = require('../lib/error');
const { Param } = require('../lib/util');
const Mosaic = require('../lib/mosaic');

async function router(schema, config) {
    const project = new (require('../lib/project').Project)(config);
    const instance = new (require('../lib/instance').Instance)(config);

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
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "tilejson": "2.2.0",
     *       "name": "naip.latest",
     *       "version": "1.0.0",
     *       "scheme": "xyz",
     *       "tiles": [ "http://localhost:8000/mosaic/naip.latest/tiles/{z}/{x}/{y}@1x?" ],
     *       "minzoom": 12,
     *       "maxzoom": 18,
     *       "bounds": [
     *           -124.81903735821528,
     *           24.49673997373884,
     *           -66.93084562551495,
     *           49.44192498524237
     *       ],
     *       "center": [ -95.87494149186512, 36.9693324794906, 12 ]
     *   }
     */
    await schema.get('/mosaic/:layer', {}, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            req.url = req.url + '/tilejson.json';

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
     * @apiSchema (Query) {jsonschema=./schema/req.query.tile.json} apiParam
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

            await proxy.request(req, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

}

module.exports = router;
