import fs from 'fs';
import path from 'path';
import Err from '@openaddresses/batch-error';
import $RefParser from 'json-schema-ref-parser';

export default async function router(schema) {
    const map = {};

    fs.readdirSync(new URL('../schema/websocket/', import.meta.url)).forEach(async (s) => {
        const url = new URL('../schema/websocket/' + s, import.meta.url);
        map[path.parse(s).name] = await $RefParser.dereference(
            url.pathname + url.hash
        );
    });

    /**
     * @api {get} /websocket Schemas
     * @apiVersion 1.0.0
     * @apiName Schemas
     * @apiGroup Websockets
     * @apiPermission public
     *
     * @apiDescription
     *   Return an object containing all the schemas used by the websocket router
     *
     * @apiSchema (Body) {jsonschema=../schema/websocket/model#osm.json} apiParam
     */
    await schema.get('/websocket', {
        res: 'res.Websocket.json'
    }, async (req, res) => {
        try {
            res.json(map);
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

/**
 * @api {post} websocket Model#OSM
 * @apiVersion 1.0.0
 * @apiName Model-OSM
 * @apiGroup Websockets
 * @apiPermission user
 *
 * Generate retraining data from live OSM data sources from OSM QA Tiles
 * and then automatically format and pass the data to the model#retrain module
 *
 * @apiSchema (Body) {jsonschema=../schema/websocket/model#osm.json} apiParam
 */

/**
 * @api {post} websocket Model#Retrain
 * @apiVersion 1.0.0
 * @apiName Model-Retrain
 * @apiGroup Websockets
 * @apiPermission user
 *
 * @apiSchema (Body) {jsonschema=../schema/websocket/model#retrain.json} apiParam
 */

/**
 * @api {post} websocket Model#Prediction
 * @apiVersion 1.0.0
 * @apiName Model-Prediction
 * @apiGroup Websockets
 * @apiPermission user
 *
 * @apiSchema (Body) {jsonschema=../schema/websocket/model#prediction.json} apiParam
 */

/**
 * @api {post} websocket Model#Patch
 * @apiVersion 1.0.0
 * @apiName Model-Patch
 * @apiGroup Websockets
 * @apiPermission user
 *
 * @apiSchema (Body) {jsonschema=../schema/websocket/model#patch.json} apiParam
 */

/**
 * @api {post} websocket Model#Status
 * @apiVersion 1.0.0
 * @apiName Model-Status
 * @apiGroup Websockets
 * @apiPermission user
 *
 * @apiSchema (Body) {jsonschema=../schema/websocket/model#status.json} apiParam
 */

/**
 * @api {post} websocket Model#Checkpoint
 * @apiVersion 1.0.0
 * @apiName Model-Checkpoint
 * @apiGroup Websockets
 * @apiPermission user
 *
 * @apiSchema (Body) {jsonschema=../schema/websocket/model#checkpoint.json} apiParam
 */

/**
 * @api {post} websocket Model#AOI
 * @apiVersion 1.0.0
 * @apiName Model-AOI
 * @apiGroup Websockets
 * @apiPermission user
 *
 * @apiSchema (Body) {jsonschema=../schema/websocket/model#aoi.json} apiParam
 */
