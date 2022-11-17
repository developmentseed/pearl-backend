import Err from '@openaddresses/batch-error';
import Proxy from '../lib/proxy.js';
import Tiles from '../lib/tiles.js';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import zlib from 'zlib';
import { promisify } from 'util';
import request from 'request';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';

const arequest = promisify(request);
const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

export default async function router(schema, config) {
    await schema.get('/tiles', {
        name: 'List Tiles',
        group: 'Tiles',
        auth: 'user',
        description: 'Return a list of all supported Vector Tile Layers',
        res: 'res.Tiles.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            return res.json(Tiles.list());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/tiles/:layer', {
        name: 'TileJSON',
        group: 'Tiles',
        auth: 'user',
        description: 'Return a TileJSON for the given layer',
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

    await schema.get('/tiles/:layer/:z/:x/:y.mvt', {
        name: 'Get MVT',
        group: 'Tiles',
        auth: 'user',
        description: `
            Return an MVT for the given layer
            This endpoint will request the upstream vector tile and parse it in place
            Adding a \`feature.properties.@ftype = '<GeoJSON Geometry Type>'\` property
        `,
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

            if (mvt.statusCode === 204) return res.status(204).send();
            if (mvt.statusCode === 404) return res.status(404).send();

            mvt = await gunzip(mvt.body);
            mvt = new VectorTile(new Protobuf(mvt));

            const feats = [];
            for (let i = 0; i < mvt.layers.osm.length; i++) {
                const feat = mvt.layers.osm.feature(i).toGeoJSON(req.params.x, req.params.y, req.params.z);
                feat.properties['@ftype'] = feat.geometry.type;

                if (!req.query.types.includes(feat.geometry.type)) continue;

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
