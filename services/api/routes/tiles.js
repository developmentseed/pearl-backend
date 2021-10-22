const Err = require('../lib/error');
const Proxy = require('../lib/proxy');
const Tiles = require('../lib/tiles');
const VectorTile = require('@mapbox/vector-tile').VectorTile;
const Protobuf = require('pbf');
const zlib = require('zlib');
const { promisify } = require('util');
const request = require('request');
const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);
const arequest = promisify(request);
const geojsonvt = require('geojson-vt');
const vtpbf = require('vt-pbf');

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

    /**
     * @api {get} /api/tiles/:layer/:z/:x/:y.mvt Get MVT
     * @apiVersion 1.0.0
     * @apiName GetMVT
     * @apiGroup Tiles
     * @apiPermission user
     *
     * @apiDescription
     *     Return an MVT for the given layer
     *     This endpoint will request the upstream vector tile and parse it in place
     *     Adding a `feature.properties.@ftype = '<GeoJSON Geometry Type>'` property
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.GetMVT.json} apiParam
     */
    await schema.get('/tiles/:layer/:z/:x/:y.mvt', {
        query: 'req.query.GetMVT.json',
        ':layer': 'string',
        ':z': 'integer',
        ':x': 'integer',
        ':y': 'integer'
    }, async (req, res) => {
        try {
            if (!Tiles.list().tiles.includes(req.params.layer)) throw new Err(400, null, 'Unsupported Layer');

            const preq = {
                method: 'GET',
                encoding: null
            };

            if (req.params.layer === 'qa-latest') {
                preq.url = new URL(`/services/z17/tiles/${req.params.z}/${req.params.x}/${req.params.y}.pbf`, new URL(config.QA_Tiles).origin);
            } else {
                throw new Err(400, null, 'Unconfigured Layer');
            }

            let mvt = await arequest(preq);
            mvt = await gunzip(mvt.body);
            mvt = new VectorTile(new Protobuf(mvt));

            const feats = [];
            for (let i = 0; i < mvt.layers.osm.length; i++) {
                const feat = mvt.layers.osm.feature(i).toGeoJSON(req.params.x, req.params.y, req.params.z);
                feat.properties['@ftype'] = feat.geometry.type;
                feats.push(feat);
            }

            const t = geojsonvt({
                type: 'FeatureCollection',
                features: feats
            }, {
                maxZoom: 17
            }).getTile(
                req.params.z,
                req.params.x,
                req.params.y
            );

            const resbody = vtpbf.fromGeojsonVt({
                osm: t
            });

            res.header('Content-Type', 'application/vnd.mapbox-vector-tile');
            res.header('Content-Encoding', 'gzip');
            res.send(await gzip(Buffer.from(resbody.buffer)));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
