
/**
* @api {get} /schema GET /schema
* @apiVersion 1.0.0
* @apiName GET-/schema
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListSchema.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListSchema.json} apiSuccess
*/


/**
* @api {get} /schema GET /schema
* @apiVersion 1.0.0
* @apiName GET-/schema
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListSchema.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListSchema.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/patch GET /project/:projectid/aoi/:aoiid/patch
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/patch
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListPatches.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListPatches.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/aoi/:aoiid/patch POST /project/:projectid/aoi/:aoiid/patch
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/aoi/:aoiid/patch
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreatePatch.json} apiParam
* @apiSchema {jsonschema=../schema/res.Patch.json} apiSuccess
*/


/**
* @api {delete} /project/:projectid/aoi/:aoiid/patch/:patchid DELETE /project/:projectid/aoi/:aoiid/patch/:patchid
* @apiVersion 1.0.0
* @apiName DELETE-/project/:projectid/aoi/:aoiid/patch/:patchid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} patchid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/patch/:patchid GET /project/:projectid/aoi/:aoiid/patch/:patchid
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/patch/:patchid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} patchid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Patch.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/patch/:patchid/tiles GET /project/:projectid/aoi/:aoiid/patch/:patchid/tiles
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/patch/:patchid/tiles
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} patchid param
*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/patch/:patchid/tiles/:z/:x/:y GET /project/:projectid/aoi/:aoiid/patch/:patchid/tiles/:z/:x/:y
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/patch/:patchid/tiles/:z/:x/:y
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} patchid param
* @apiParam {integer} z param
* @apiParam {integer} x param
* @apiParam {integer} y param
*
*
*
*
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/patch/:patchid/download GET /project/:projectid/aoi/:aoiid/patch/:patchid/download
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/patch/:patchid/download
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} patchid param
*
*
*
*
*/


/**
* @api {post} /project/:projectid/aoi/:aoiid/patch/:patchid/upload POST /project/:projectid/aoi/:aoiid/patch/:patchid/upload
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/aoi/:aoiid/patch/:patchid/upload
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} patchid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Patch.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid GET /project/:projectid/aoi/:aoiid
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
*
* @apiSchema {jsonschema=../schema/res.AOI.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/tiles GET /project/:projectid/aoi/:aoiid/tiles
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/tiles
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/tiles/:z/:x/:y GET /project/:projectid/aoi/:aoiid/tiles/:z/:x/:y
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/tiles/:z/:x/:y
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} z param
* @apiParam {integer} x param
* @apiParam {integer} y param
*
*
*
*
*/


/**
* @api {post} /project/:projectid/aoi/:aoiid/upload POST /project/:projectid/aoi/:aoiid/upload
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/aoi/:aoiid/upload
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
*
* @apiSchema {jsonschema=../schema/res.AOI.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/download/raw GET /project/:projectid/aoi/:aoiid/download/raw
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/download/raw
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
*
*
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/download/color GET /project/:projectid/aoi/:aoiid/download/color
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/download/color
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
*
*
*/


/**
* @api {get} /project/:projectid/aoi GET /project/:projectid/aoi
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.aoi.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListAOIs.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/aoi POST /project/:projectid/aoi
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/aoi
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateAOI.json} apiParam
* @apiSchema {jsonschema=../schema/res.AOI.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/aoi/:aoiid/share POST /project/:projectid/aoi/:aoiid/share
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/aoi/:aoiid/share
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Share.json} apiSuccess
*/


/**
* @api {delete} /project/:projectid/aoi/:aoiid/share/:shareuuid DELETE /project/:projectid/aoi/:aoiid/share/:shareuuid
* @apiVersion 1.0.0
* @apiName DELETE-/project/:projectid/aoi/:aoiid/share/:shareuuid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {string} shareuuid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/share GET /project/:projectid/share
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/share
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.Share.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListShare.json} apiSuccess
*/


/**
* @api {delete} /project/:projectid/aoi/:aoiid DELETE /project/:projectid/aoi/:aoiid
* @apiVersion 1.0.0
* @apiName DELETE-/project/:projectid/aoi/:aoiid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {patch} /project/:projectid/aoi/:aoiid PATCH /project/:projectid/aoi/:aoiid
* @apiVersion 1.0.0
* @apiName PATCH-/project/:projectid/aoi/:aoiid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchAOI.json} apiParam
* @apiSchema {jsonschema=../schema/res.AOI.json} apiSuccess
*/


/**
* @api {get} /share/:shareuuid GET /share/:shareuuid
* @apiVersion 1.0.0
* @apiName GET-/share/:shareuuid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {string} shareuuid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Share.json} apiSuccess
*/


/**
* @api {get} /share/:shareuuid/tiles GET /share/:shareuuid/tiles
* @apiVersion 1.0.0
* @apiName GET-/share/:shareuuid/tiles
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {string} shareuuid param
*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /share/:shareuuid/tiles/:z/:x/:y GET /share/:shareuuid/tiles/:z/:x/:y
* @apiVersion 1.0.0
* @apiName GET-/share/:shareuuid/tiles/:z/:x/:y
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {string} shareuuid param
* @apiParam {integer} z param
* @apiParam {integer} x param
* @apiParam {integer} y param
*
*
*
*
*/


/**
* @api {get} /share/:shareuuid/download/raw GET /share/:shareuuid/download/raw
* @apiVersion 1.0.0
* @apiName GET-/share/:shareuuid/download/raw
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {string} shareuuid param
*
*
*
*
*/


/**
* @api {get} /share/:shareuuid/download/color GET /share/:shareuuid/download/color
* @apiVersion 1.0.0
* @apiName GET-/share/:shareuuid/download/color
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {string} shareuuid param
*
*
*
*
*/


/**
* @api {get} /project/:projectid/batch GET /project/:projectid/batch
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/batch
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListBatches.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListBatches.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/batch POST /project/:projectid/batch
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/batch
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateBatch.json} apiParam
* @apiSchema {jsonschema=../schema/res.Batch.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/batch/:batchid GET /project/:projectid/batch/:batchid
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/batch/:batchid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} batchid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Batch.json} apiSuccess
*/


/**
* @api {patch} /project/:projectid/batch/:batchid PATCH /project/:projectid/batch/:batchid
* @apiVersion 1.0.0
* @apiName PATCH-/project/:projectid/batch/:batchid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} batchid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchBatch.json} apiParam
* @apiSchema {jsonschema=../schema/res.Batch.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/checkpoint/:checkpointid GET /project/:projectid/checkpoint/:checkpointid
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/checkpoint/:checkpointid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Checkpoint.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/checkpoint/:checkpointid/osmtag GET /project/:projectid/checkpoint/:checkpointid/osmtag
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/checkpoint/:checkpointid/osmtag
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
*
* @apiSchema {jsonschema=../schema/res.OSMTag.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/checkpoint/:checkpointid/tiles GET /project/:projectid/checkpoint/:checkpointid/tiles
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/checkpoint/:checkpointid/tiles
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/checkpoint/:checkpointid/tiles/:z/:x/:y.mvt GET /project/:projectid/checkpoint/:checkpointid/tiles/:z/:x/:y.mvt
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/checkpoint/:checkpointid/tiles/:z/:x/:y.mvt
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
* @apiParam {integer} z param
* @apiParam {integer} x param
* @apiParam {integer} y param
*
*
*
*
*/


/**
* @api {post} /project/:projectid/checkpoint/:checkpointid/upload POST /project/:projectid/checkpoint/:checkpointid/upload
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/checkpoint/:checkpointid/upload
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Checkpoint.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/checkpoint/:checkpointid/download GET /project/:projectid/checkpoint/:checkpointid/download
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/checkpoint/:checkpointid/download
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
*
*
*/


/**
* @api {get} /project/:projectid/checkpoint GET /project/:projectid/checkpoint
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/checkpoint
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.checkpoint.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListCheckpoints.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/checkpoint POST /project/:projectid/checkpoint
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/checkpoint
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateCheckpoint.json} apiParam
* @apiSchema {jsonschema=../schema/res.Checkpoint.json} apiSuccess
*/


/**
* @api {delete} /project/:projectid/checkpoint/:checkpointid DELETE /project/:projectid/checkpoint/:checkpointid
* @apiVersion 1.0.0
* @apiName DELETE-/project/:projectid/checkpoint/:checkpointid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {patch} /project/:projectid/checkpoint/:checkpointid PATCH /project/:projectid/checkpoint/:checkpointid
* @apiVersion 1.0.0
* @apiName PATCH-/project/:projectid/checkpoint/:checkpointid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchCheckpoint.json} apiParam
* @apiSchema {jsonschema=../schema/res.Checkpoint.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/instance POST /project/:projectid/instance
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/instance
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateInstance.json} apiParam
* @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
*/


/**
* @api {patch} /project/:projectid/instance/:instanceid PATCH /project/:projectid/instance/:instanceid
* @apiVersion 1.0.0
* @apiName PATCH-/project/:projectid/instance/:instanceid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} instanceid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchInstance.json} apiParam
* @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/instance GET /project/:projectid/instance
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/instance
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListInstances.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListInstances.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/instance/:instanceid GET /project/:projectid/instance/:instanceid
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/instance/:instanceid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
* @apiParam {integer} instanceid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
*/


/**
* @api {get} /instance/:instanceid GET /instance/:instanceid
* @apiVersion 1.0.0
* @apiName GET-/instance/:instanceid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} instanceid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
*/


/**
* @api {delete} /instance DELETE /instance
* @apiVersion 1.0.0
* @apiName DELETE-/instance
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
*
*/


/**
* @api {post} /model POST /model
* @apiVersion 1.0.0
* @apiName POST-/model
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateModel.json} apiParam
* @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
*/


/**
* @api {patch} /model/:modelid PATCH /model/:modelid
* @apiVersion 1.0.0
* @apiName PATCH-/model/:modelid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} modelid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchModel.json} apiParam
* @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
*/


/**
* @api {post} /model/:modelid/upload POST /model/:modelid/upload
* @apiVersion 1.0.0
* @apiName POST-/model/:modelid/upload
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} modelid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
*/


/**
* @api {get} /model GET /model
* @apiVersion 1.0.0
* @apiName GET-/model
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListModels.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListModels.json} apiSuccess
*/


/**
* @api {delete} /model/:modelid DELETE /model/:modelid
* @apiVersion 1.0.0
* @apiName DELETE-/model/:modelid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} modelid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /model/:modelid GET /model/:modelid
* @apiVersion 1.0.0
* @apiName GET-/model/:modelid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} modelid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
*/


/**
* @api {get} /model/:modelid/osmtag GET /model/:modelid/osmtag
* @apiVersion 1.0.0
* @apiName GET-/model/:modelid/osmtag
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} modelid param
*
*
*
* @apiSchema {jsonschema=../schema/res.OSMTag.json} apiSuccess
*/


/**
* @api {get} /model/:modelid/download GET /model/:modelid/download
* @apiVersion 1.0.0
* @apiName GET-/model/:modelid/download
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} modelid param
*
*
*
*
*/


/**
* @api {get} /mosaic GET /mosaic
* @apiVersion 1.0.0
* @apiName GET-/mosaic
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Mosaic.json} apiSuccess
*/


/**
* @api {get} /mosaic/:layer GET /mosaic/:layer
* @apiVersion 1.0.0
* @apiName GET-/mosaic/:layer
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {string} layer param
*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /mosaic/:layer/tiles/:z/:x/:y.:format GET /mosaic/:layer/tiles/:z/:x/:y.:format
* @apiVersion 1.0.0
* @apiName GET-/mosaic/:layer/tiles/:z/:x/:y.:format
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {string} layer param
* @apiParam {string} format param
* @apiParam {integer} z param
* @apiParam {integer} x param
* @apiParam {integer} y param
*
*
*
*
*/


/**
* @api {get} /project GET /project
* @apiVersion 1.0.0
* @apiName GET-/project
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListProjects.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListProjects.json} apiSuccess
*/


/**
* @api {get} /project/:projectid GET /project/:projectid
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Project.json} apiSuccess
*/


/**
* @api {post} /project POST /project
* @apiVersion 1.0.0
* @apiName POST-/project
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateProject.json} apiParam
* @apiSchema {jsonschema=../schema/res.Project.json} apiSuccess
*/


/**
* @api {patch} /project/:projectid PATCH /project/:projectid
* @apiVersion 1.0.0
* @apiName PATCH-/project/:projectid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchProject.json} apiParam
* @apiSchema {jsonschema=../schema/res.Project.json} apiSuccess
*/


/**
* @api {delete} /project/:projectid DELETE /project/:projectid
* @apiVersion 1.0.0
* @apiName DELETE-/project/:projectid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} projectid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {post} /user POST /user
* @apiVersion 1.0.0
* @apiName POST-/user
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
*
*/


/**
* @api {get} /tiles GET /tiles
* @apiVersion 1.0.0
* @apiName GET-/tiles
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Tiles.json} apiSuccess
*/


/**
* @api {get} /tiles/:layer GET /tiles/:layer
* @apiVersion 1.0.0
* @apiName GET-/tiles/:layer
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {string} layer param
*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /tiles/:layer/:z/:x/:y.mvt GET /tiles/:layer/:z/:x/:y.mvt
* @apiVersion 1.0.0
* @apiName GET-/tiles/:layer/:z/:x/:y.mvt
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {string} layer param
* @apiParam {integer} z param
* @apiParam {integer} x param
* @apiParam {integer} y param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.GetMVT.json} apiParam
*
*
*/


/**
* @api {get} /token GET /token
* @apiVersion 1.0.0
* @apiName GET-/token
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListTokens.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListTokens.json} apiSuccess
*/


/**
* @api {post} /token POST /token
* @apiVersion 1.0.0
* @apiName POST-/token
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateToken.json} apiParam
* @apiSchema {jsonschema=../schema/res.Token.json} apiSuccess
*/


/**
* @api {delete} /token/:tokenid DELETE /token/:tokenid
* @apiVersion 1.0.0
* @apiName DELETE-/token/:tokenid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} tokenid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /user GET /user
* @apiVersion 1.0.0
* @apiName GET-/user
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListUsers.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListUsers.json} apiSuccess
*/


/**
* @api {patch} /user/:userid PATCH /user/:userid
* @apiVersion 1.0.0
* @apiName PATCH-/user/:userid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} userid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchUser.json} apiParam
* @apiSchema {jsonschema=../schema/res.User.json} apiSuccess
*/


/**
* @api {get} /user/me GET /user/me
* @apiVersion 1.0.0
* @apiName GET-/user/me
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Me.json} apiSuccess
*/


/**
* @api {get} /user/:userid GET /user/:userid
* @apiVersion 1.0.0
* @apiName GET-/user/:userid
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*
* @apiParam {integer} userid param
*
*
*
* @apiSchema {jsonschema=../schema/res.User.json} apiSuccess
*/


/**
* @api {get} /websocket GET /websocket
* @apiVersion 1.0.0
* @apiName GET-/websocket
* @apiGroup Default
* @apiPermission Unknown
*
* @apidescription
*   No Description
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Websocket.json} apiSuccess
*/
