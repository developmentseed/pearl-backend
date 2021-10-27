// This file is purely used by APIDoc to document websockets

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

