const Err = require('../lib/error');
const Proxy = require('../lib/proxy');
const Tiles = require('../lib/tiles');

async function router(schema, config) {
    /**
     * @api {get} /api/tiles
     * @apiVersion 1.0.0
     * @apiName ListTiles
     * @apiGroup Tiles
     * @apiPermission user
     *
     * @apiDescription
     *     Return a list of all supported Vector Tile Layers
     *
     * @apiSchema {jsonschema=../schema/res.Tiles.json} apiSuccess
     */
    await schema.get('/tiles', {
        res: 'res.Tiles.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            return res.json(Tiles.list());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/tiles/:layer TileJSON
     * @apiVersion 1.0.0
     * @apiName TileJSONTiles
     * @apiGroup Tiles
     * @apiPermission user
     *
     * @apiDescription
     *     Return a TileJSON for the given layer
     *
     * @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
     */
    await schema.get('/tiles/:layer', {
        ':layer': 'string',
        res: 'res.TileJSON.json'
    }, async (req, res) => {
        try {
            if (!Tiles.list().tiles.includes(req.params.layer)) throw new Err(400, null, 'Unsupported Layer');

            let tilejson;
            if (req.params.layer === 'qa-latest') {
                req.url = '';
                tilejson = (await Proxy.request(req, false, config.QA_Tiles)).body;
            } else {
                throw new Err(400, null, 'Unconfigured Layer');
            }


            return res.json(tilejson);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
