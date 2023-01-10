
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
* @api {get} /project/:projectid/aoi/:aoiid/patch List Patches
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/patch
* @apiGroup AOIPatch
* @apiPermission user
*
* @apidescription
*   Return all patches for a given API
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListPatches.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListPatches.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/aoi/:aoiid/patch Create Patch
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/aoi/:aoiid/patch
* @apiGroup AOIPatch
* @apiPermission user
*
* @apidescription
*   Create a new patch
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreatePatch.json} apiParam
* @apiSchema {jsonschema=../schema/res.Patch.json} apiSuccess
*/


/**
* @api {delete} /project/:projectid/aoi/:aoiid/patch/:patchid Delete Patch
* @apiVersion 1.0.0
* @apiName DELETE-/project/:projectid/aoi/:aoiid/patch/:patchid
* @apiGroup AOIPatch
* @apiPermission user
*
* @apidescription
*   Delete a given patch
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
* @api {get} /project/:projectid/aoi/:aoiid/patch/:patchid Get Patch
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/patch/:patchid
* @apiGroup AOIPatch
* @apiPermission user
*
* @apidescription
*   Get a specific patch
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
* @api {get} /project/:projectid/aoi/:aoiid/patch/:patchid/tiles TileJSON Patch
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/patch/:patchid/tiles
* @apiGroup AOIPatch
* @apiPermission user
*
* @apidescription
*   Get the TileJSON for a given AOI Patch
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
* @api {get} /project/:projectid/aoi/:aoiid/patch/:patchid/tiles/:z/:x/:y Tile Patch
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/patch/:patchid/tiles/:z/:x/:y
* @apiGroup AOIPatch
* @apiPermission user
*
* @apidescription
*   Return a Tile for a given AOI Patch
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
* @api {get} /project/:projectid/aoi/:aoiid/patch/:patchid/download Download Patch
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/patch/:patchid/download
* @apiGroup AOIPatch
* @apiPermission user
*
* @apidescription
*   Download a Tiff Patch
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
* @api {post} /project/:projectid/aoi/:aoiid/patch/:patchid/upload Upload Patch
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/aoi/:aoiid/patch/:patchid/upload
* @apiGroup AOIPatch
* @apiPermission admin
*
* @apidescription
*   Upload a new AOI Patch asset to the API
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
* @api {get} /project/:projectid/aoi/:aoiid/timeframe/:timeframeid Get Timeframe
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/timeframe/:timeframeid
* @apiGroup TimeFrame
* @apiPermission user
*
* @apidescription
*   Return all information about a given AOI Timeframe
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} timeframeid param
*
*
*
* @apiSchema {jsonschema=../schema/res.TimeFrame.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/timeframe/:timeframeid/tiles TileJSON
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/tiles
* @apiGroup TimeFrame
* @apiPermission user
*
* @apidescription
*   Return a TileJSON for a given AOI TimeFrame
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} timeframeid param
*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/timeframe/:timeframeid/tiles/:z/:x/:y Tiles
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/tiles/:z/:x/:y
* @apiGroup TimeFrame
* @apiPermission user
*
* @apidescription
*   Return a Tile for a given AOI TimeFrame
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} timeframeid param
* @apiParam {integer} z param
* @apiParam {integer} x param
* @apiParam {integer} y param
*
*
*
*
*/


/**
* @api {post} /project/:projectid/aoi/:aoiid/timeframe/:timeframeid/upload Upload TimeFrame
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/upload
* @apiGroup TimeFrame
* @apiPermission admin
*
* @apidescription
*   Upload a new GeoTIFF to the API
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} timeframeid param
*
*
*
* @apiSchema {jsonschema=../schema/res.TimeFrame.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/timeframe/:timeframeid/download/raw Download Raw TimeFrame
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/download/raw
* @apiGroup TimeFrame
* @apiPermission admin
*
* @apidescription
*   Return the TimeFrame Fabric as a GeoTIFF
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} timeframeid param
*
*
*
*
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/timeframe/:timeframeid/download/color Download Color TimeFrame
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/download/color
* @apiGroup TimeFrame
* @apiPermission user
*
* @apidescription
*   Return the colourized aoi fabric geotiff - but doesn't save it to share page
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} timeframeid param
*
*
*
*
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid/timeframe List TimeFrames
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid/timeframe
* @apiGroup TimeFrame
* @apiPermission user
*
* @apidescription
*   Return all TimeFrames for a given instance
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.aoi.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListTimeFrames.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/aoi/:aoiid/timeframe Create TimeFrame
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/aoi/:aoiid/timeframe
* @apiGroup TimeFrame
* @apiPermission admin
*
* @apidescription
*
Create a new AOI during an instance
Note: this is an internal API that is called by the websocket GPU

*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateTimeFrame.json} apiParam
* @apiSchema {jsonschema=../schema/res.TimeFrame.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/aoi/:aoiid/timeframe/:timeframeid/share Create Share
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/share
* @apiGroup Share
* @apiPermission user
*
* @apidescription
*   Export an AOI & it's patches to share
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} timeframeid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Share.json} apiSuccess
*/


/**
* @api {delete} /project/:projectid/aoi/:aoiid/timeframe/:timeframeid/share/:shareuuid Delete Share
* @apiVersion 1.0.0
* @apiName DELETE-/project/:projectid/aoi/:aoiid/timeframe/:timeframeid/share/:shareuuid
* @apiGroup Share
* @apiPermission user
*
* @apidescription
*   Delete a shared AOI
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} timeframeid param
* @apiParam {string} shareuuid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/share List Shares
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/share
* @apiGroup Share
* @apiPermission user
*
* @apidescription
*   Return all shares for a given project
*
* @apiParam {integer} projectid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.Share.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListShare.json} apiSuccess
*/


/**
* @api {delete} /project/:projectid/aoi/:aoiid/timeframe/:timeframeid Delete AOI
* @apiVersion 1.0.0
* @apiName DELETE-/project/:projectid/aoi/:aoiid/timeframe/:timeframeid
* @apiGroup TimeFrame
* @apiPermission user
*
* @apidescription
*   Delete an existing AOI
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} timeframeid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {patch} /project/:projectid/aoi/:aoiid/timeframe/:timeframeid Patch AOI
* @apiVersion 1.0.0
* @apiName PATCH-/project/:projectid/aoi/:aoiid/timeframe/:timeframeid
* @apiGroup TimeFrame
* @apiPermission user
*
* @apidescription
*   Update an AOI
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
* @apiParam {integer} timeframeid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchAOI.json} apiParam
* @apiSchema {jsonschema=../schema/res.AOI.json} apiSuccess
*/


/**
* @api {get} /share/:shareuuid Get Share
* @apiVersion 1.0.0
* @apiName GET-/share/:shareuuid
* @apiGroup Share
* @apiPermission public
*
* @apidescription
*   Return all information about a given AOI Export using the UUID
*
* @apiParam {string} shareuuid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Share.json} apiSuccess
*/


/**
* @api {get} /share/:shareuuid/tiles TileJSON
* @apiVersion 1.0.0
* @apiName GET-/share/:shareuuid/tiles
* @apiGroup Share
* @apiPermission public
*
* @apidescription
*   Return tilejson for a given AOI using uuid
*
* @apiParam {string} shareuuid param
*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /share/:shareuuid/tiles/:z/:x/:y Tiles
* @apiVersion 1.0.0
* @apiName GET-/share/:shareuuid/tiles/:z/:x/:y
* @apiGroup Share
* @apiPermission public
*
* @apidescription
*   Return a Tile for a given AOI using uuid
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
* @api {get} /share/:shareuuid/download/raw Download Raw AOI
* @apiVersion 1.0.0
* @apiName GET-/share/:shareuuid/download/raw
* @apiGroup Share
* @apiPermission public
*
* @apidescription
*   Return the aoi fabric geotiff
*
* @apiParam {string} shareuuid param
*
*
*
*
*/


/**
* @api {get} /share/:shareuuid/download/color Download Color AOI
* @apiVersion 1.0.0
* @apiName GET-/share/:shareuuid/download/color
* @apiGroup Share
* @apiPermission public
*
* @apidescription
*   Return the colourized aoi fabric geotiff
*
* @apiParam {string} shareuuid param
*
*
*
*
*/


/**
* @api {get} /project/:projectid/aoi/:aoiid Get AOI
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi/:aoiid
* @apiGroup AOI
* @apiPermission user
*
* @apidescription
*   Return all information about a given AOI
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
*
* @apiSchema {jsonschema=../schema/res.AOI.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/aoi List AOIs
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/aoi
* @apiGroup AOI
* @apiPermission user
*
* @apidescription
*   Return all AOIs for a given instance
*
* @apiParam {integer} projectid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.aoi.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListAOIs.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/aoi Create AOI
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/aoi
* @apiGroup AOI
* @apiPermission admin
*
* @apidescription
*
Create a new AOI during an instance
Note: this is an internal API that is called by the websocket GPU

*
* @apiParam {integer} projectid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateAOI.json} apiParam
* @apiSchema {jsonschema=../schema/res.AOI.json} apiSuccess
*/


/**
* @api {patch} /project/:projectid/aoi/:aoiid Patch AOI
* @apiVersion 1.0.0
* @apiName PATCH-/project/:projectid/aoi/:aoiid
* @apiGroup AOI
* @apiPermission user
*
* @apidescription
*   Update an AOI
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchAOI.json} apiParam
* @apiSchema {jsonschema=../schema/res.AOI.json} apiSuccess
*/


/**
* @api {patch} /project/:projectid/aoi/:aoiid Patch AOI
* @apiVersion 1.0.0
* @apiName PATCH-/project/:projectid/aoi/:aoiid
* @apiGroup AOI
* @apiPermission user
*
* @apidescription
*   Update an AOI
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchAOI.json} apiParam
* @apiSchema {jsonschema=../schema/res.AOI.json} apiSuccess
*/


/**
* @api {delete} /project/:projectid/aoi/:aoiid Delete AOI
* @apiVersion 1.0.0
* @apiName DELETE-/project/:projectid/aoi/:aoiid
* @apiGroup AOI
* @apiPermission user
*
* @apidescription
*   Delete an existing AOI
*
* @apiParam {integer} projectid param
* @apiParam {integer} aoiid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/batch List Batch
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/batch
* @apiGroup Batch
* @apiPermission user
*
* @apidescription
*   Return a list of all batches for a given user
*
* @apiParam {integer} projectid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListBatches.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListBatches.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/batch Create Batch
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/batch
* @apiGroup Batch
* @apiPermission user
*
* @apidescription
*   Create a new batch
*
* @apiParam {integer} projectid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateBatch.json} apiParam
* @apiSchema {jsonschema=../schema/res.Batch.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/batch/:batchid Get Batch
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/batch/:batchid
* @apiGroup Batch
* @apiPermission user
*
* @apidescription
*   Return a single batch
*
* @apiParam {integer} projectid param
* @apiParam {integer} batchid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Batch.json} apiSuccess
*/


/**
* @api {patch} /project/:projectid/batch/:batchid Patch Batch
* @apiVersion 1.0.0
* @apiName PATCH-/project/:projectid/batch/:batchid
* @apiGroup Batch
* @apiPermission user
*
* @apidescription
*   Update a batch
*
* @apiParam {integer} projectid param
* @apiParam {integer} batchid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchBatch.json} apiParam
* @apiSchema {jsonschema=../schema/res.Batch.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/checkpoint/:checkpointid Get Checkpoint
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/checkpoint/:checkpointid
* @apiGroup Checkpoints
* @apiPermission user
*
* @apidescription
*   Return a given checkpoint for a given instance
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Checkpoint.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/checkpoint/:checkpointid/osmtag Get OSMTags
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/checkpoint/:checkpointid/osmtag
* @apiGroup Checkpoints
* @apiPermission user
*
* @apidescription
*   Return OSMTags for a Checkpoint if they exist
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
*
* @apiSchema {jsonschema=../schema/res.OSMTag.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/checkpoint/:checkpointid/tiles TileJSON Checkpoint
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/checkpoint/:checkpointid/tiles
* @apiGroup Checkpoints
* @apiPermission user
*
* @apidescription
*   Return tilejson for a given Checkpoint
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/checkpoint/:checkpointid/tiles/:z/:x/:y.mvt Tile Checkpoint
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/checkpoint/:checkpointid/tiles/:z/:x/:y.mvt
* @apiGroup Checkpoints
* @apiPermission user
*
* @apidescription
*   Return a tile for a given Checkpoint
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
* @api {post} /project/:projectid/checkpoint/:checkpointid/upload Upload Checkpoint
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/checkpoint/:checkpointid/upload
* @apiGroup Checkpoints
* @apiPermission admin
*
* @apidescription
*   Upload a new checkpoint asset to the API
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Checkpoint.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/checkpoint/:checkpointid/download Download Checkpoint
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/checkpoint/:checkpointid/download
* @apiGroup Checkpoints
* @apiPermission user
*
* @apidescription
*   Download a checkpoint asset from the API
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
*
*
*/


/**
* @api {get} /project/:projectid/checkpoint List Checkpoints
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/checkpoint
* @apiGroup Checkpoints
* @apiPermission user
*
* @apidescription
*   Return all checkpoints for a given instance
*
* @apiParam {integer} projectid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.checkpoint.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListCheckpoints.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/checkpoint Create Checkpoint
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/checkpoint
* @apiGroup Checkpoints
* @apiPermission admin
*
* @apidescription
*
Create a new checkpont during an instance
Note: this is an internal API that is called by the websocket GPU

*
* @apiParam {integer} projectid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateCheckpoint.json} apiParam
* @apiSchema {jsonschema=../schema/res.Checkpoint.json} apiSuccess
*/


/**
* @api {delete} /project/:projectid/checkpoint/:checkpointid Delete Checkpoint
* @apiVersion 1.0.0
* @apiName DELETE-/project/:projectid/checkpoint/:checkpointid
* @apiGroup Checkpoints
* @apiPermission user
*
* @apidescription
*
Delete an existing Checkpoint
NOTE: This will also delete AOIs that depend on the given checkpoint

*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {patch} /project/:projectid/checkpoint/:checkpointid Patch Checkpoint
* @apiVersion 1.0.0
* @apiName PATCH-/project/:projectid/checkpoint/:checkpointid
* @apiGroup Checkpoints
* @apiPermission admin
*
* @apidescription
*   Update a checkpoint
*
* @apiParam {integer} projectid param
* @apiParam {integer} checkpointid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchCheckpoint.json} apiParam
* @apiSchema {jsonschema=../schema/res.Checkpoint.json} apiSuccess
*/


/**
* @api {post} /project/:projectid/instance Create Instance
* @apiVersion 1.0.0
* @apiName POST-/project/:projectid/instance
* @apiGroup Instance
* @apiPermission user
*
* @apidescription
*
Instruct the GPU pool to start a new model instance and return a time limited session
token for accessing the websockets GPU API

*
* @apiParam {integer} projectid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateInstance.json} apiParam
* @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
*/


/**
* @api {patch} /project/:projectid/instance/:instanceid Patch Instance
* @apiVersion 1.0.0
* @apiName PATCH-/project/:projectid/instance/:instanceid
* @apiGroup Instance
* @apiPermission admin
*
* @apidescription
*   Update an instance state
*
* @apiParam {integer} projectid param
* @apiParam {integer} instanceid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchInstance.json} apiParam
* @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/instance List Instances
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/instance
* @apiGroup Instance
* @apiPermission user
*
* @apidescription
*
Return a list of instances. Note that users can only get their own instances and use of the `uid`
field will be pinned to their own uid. Admins can filter by any uid or none.

*
* @apiParam {integer} projectid param
*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListInstances.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListInstances.json} apiSuccess
*/


/**
* @api {get} /project/:projectid/instance/:instanceid Get Instance
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid/instance/:instanceid
* @apiGroup Instance
* @apiPermission user
*
* @apidescription
*   Return all information about a given instance
*
* @apiParam {integer} projectid param
* @apiParam {integer} instanceid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
*/


/**
* @api {get} /instance/:instanceid Self Instance
* @apiVersion 1.0.0
* @apiName GET-/instance/:instanceid
* @apiGroup Instance
* @apiPermission admin
*
* @apidescription
*
A newly instantiated GPU Instance does not know what it's project id is. This API
allows ONLY AN ADMIN TOKEN to fetch any instance, regardless of project

*
* @apiParam {integer} instanceid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Instance.json} apiSuccess
*/


/**
* @api {delete} /instance Deactivate Instances
* @apiVersion 1.0.0
* @apiName DELETE-/instance
* @apiGroup Instance
* @apiPermission admin
*
* @apidescription
*   Set all instances to active: false - used by the socket server upon initial api connection
*

*
*
*
*
*/


/**
* @api {post} /model Create Model
* @apiVersion 1.0.0
* @apiName POST-/model
* @apiGroup Model
* @apiPermission admin
*
* @apidescription
*   Create a new model in the system
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateModel.json} apiParam
* @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
*/


/**
* @api {patch} /model/:modelid Update Model
* @apiVersion 1.0.0
* @apiName PATCH-/model/:modelid
* @apiGroup Model
* @apiPermission admin
*
* @apidescription
*   Update a model
*
* @apiParam {integer} modelid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchModel.json} apiParam
* @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
*/


/**
* @api {post} /model/:modelid/upload Upload Model
* @apiVersion 1.0.0
* @apiName POST-/model/:modelid/upload
* @apiGroup Model
* @apiPermission admin
*
* @apidescription
*   Upload a new model asset
*
* @apiParam {integer} modelid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
*/


/**
* @api {get} /model List Models
* @apiVersion 1.0.0
* @apiName GET-/model
* @apiGroup Model
* @apiPermission user
*
* @apidescription
*   List information about a set of models
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListModels.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListModels.json} apiSuccess
*/


/**
* @api {delete} /model/:modelid Delete Model
* @apiVersion 1.0.0
* @apiName DELETE-/model/:modelid
* @apiGroup Model
* @apiPermission admin
*
* @apidescription
*
Mark a model as inactive, and disallow subsequent instances of this model
Note: this will not affect currently running instances of the model

*
* @apiParam {integer} modelid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /model/:modelid Get Model
* @apiVersion 1.0.0
* @apiName GET-/model/:modelid
* @apiGroup Model
* @apiPermission user
*
* @apidescription
*   Return all information about a single model
*
* @apiParam {integer} modelid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Model.json} apiSuccess
*/


/**
* @api {get} /model/:modelid/osmtag Get OSMTags
* @apiVersion 1.0.0
* @apiName GET-/model/:modelid/osmtag
* @apiGroup Model
* @apiPermission user
*
* @apidescription
*   Return OSMTags for a model if they exist
*
* @apiParam {integer} modelid param
*
*
*
* @apiSchema {jsonschema=../schema/res.OSMTag.json} apiSuccess
*/


/**
* @api {get} /model/:modelid/download Download Model
* @apiVersion 1.0.0
* @apiName GET-/model/:modelid/download
* @apiGroup Model
* @apiPermission user
*
* @apidescription
*   Return the model itself
*
* @apiParam {integer} modelid param
*
*
*
*
*/


/**
* @api {get} /mosaic List Mosaics
* @apiVersion 1.0.0
* @apiName GET-/mosaic
* @apiGroup Mosaic
* @apiPermission public
*
* @apidescription
*   Return a list of currently supported mosaic layers
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Mosaic.json} apiSuccess
*/


/**
* @api {get} /mosaic/:layer Get TileJSON
* @apiVersion 1.0.0
* @apiName GET-/mosaic/:layer
* @apiGroup Mosaic
* @apiPermission public
*
* @apidescription
*   Return a TileJSON object for a given mosaic layer
*
* @apiParam {string} layer param
*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /mosaic/:layer/tiles/:z/:x/:y.:format Get Tile
* @apiVersion 1.0.0
* @apiName GET-/mosaic/:layer/tiles/:z/:x/:y.:format
* @apiGroup Mosaic
* @apiPermission public
*
* @apidescription
*   Return an aerial imagery tile for a given set of mercator coordinates
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
* @api {get} /project List Projects
* @apiVersion 1.0.0
* @apiName GET-/project
* @apiGroup Projects
* @apiPermission user
*
* @apidescription
*   Return a list of all projects
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListProjects.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListProjects.json} apiSuccess
*/


/**
* @api {get} /project/:projectid Get Project
* @apiVersion 1.0.0
* @apiName GET-/project/:projectid
* @apiGroup Projects
* @apiPermission user
*
* @apidescription
*   Return all information about a given project
*
* @apiParam {integer} projectid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Project.json} apiSuccess
*/


/**
* @api {post} /project Create Project
* @apiVersion 1.0.0
* @apiName POST-/project
* @apiGroup Projects
* @apiPermission user
*
* @apidescription
*   Create a new project
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateProject.json} apiParam
* @apiSchema {jsonschema=../schema/res.Project.json} apiSuccess
*/


/**
* @api {patch} /project/:projectid Patch Project
* @apiVersion 1.0.0
* @apiName PATCH-/project/:projectid
* @apiGroup Projects
* @apiPermission user
*
* @apidescription
*   Update an existing project
*
* @apiParam {integer} projectid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchProject.json} apiParam
* @apiSchema {jsonschema=../schema/res.Project.json} apiSuccess
*/


/**
* @api {delete} /project/:projectid Delete Project
* @apiVersion 1.0.0
* @apiName DELETE-/project/:projectid
* @apiGroup Projects
* @apiPermission user
*
* @apidescription
*   Archive a project
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
* @api {get} /tiles List Tiles
* @apiVersion 1.0.0
* @apiName GET-/tiles
* @apiGroup Tiles
* @apiPermission user
*
* @apidescription
*   Return a list of all supported Vector Tile Layers
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Tiles.json} apiSuccess
*/


/**
* @api {get} /tiles/:layer TileJSON
* @apiVersion 1.0.0
* @apiName GET-/tiles/:layer
* @apiGroup Tiles
* @apiPermission user
*
* @apidescription
*   Return a TileJSON for the given layer
*
* @apiParam {string} layer param
*
*
*
* @apiSchema {jsonschema=../schema/res.TileJSON.json} apiSuccess
*/


/**
* @api {get} /tiles/:layer/:z/:x/:y.mvt Get MVT
* @apiVersion 1.0.0
* @apiName GET-/tiles/:layer/:z/:x/:y.mvt
* @apiGroup Tiles
* @apiPermission user
*
* @apidescription
*
Return an MVT for the given layer
This endpoint will request the upstream vector tile and parse it in place
Adding a `feature.properties.@ftype = '<GeoJSON Geometry Type>'` property

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
* @api {get} /token List Tokens
* @apiVersion 1.0.0
* @apiName GET-/token
* @apiGroup Token
* @apiPermission user
*
* @apidescription
*   List Tokens
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListTokens.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListTokens.json} apiSuccess
*/


/**
* @api {post} /token Create Tokens
* @apiVersion 1.0.0
* @apiName POST-/token
* @apiGroup Token
* @apiPermission user
*
* @apidescription
*   Create a new API token to perform API requests with
*

*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.CreateToken.json} apiParam
* @apiSchema {jsonschema=../schema/res.Token.json} apiSuccess
*/


/**
* @api {delete} /token/:tokenid Delete Token
* @apiVersion 1.0.0
* @apiName DELETE-/token/:tokenid
* @apiGroup Token
* @apiPermission user
*
* @apidescription
*   Delete an existing token
*
* @apiParam {integer} tokenid param
*
*
*
* @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
*/


/**
* @api {get} /user List Users
* @apiVersion 1.0.0
* @apiName GET-/user
* @apiGroup User
* @apiPermission admin
*
* @apidescription
*   Return a list of users that have registered with the service
*

*
* @apiSchema (Query) {jsonschema=../schema/req.query.ListUsers.json} apiParam
*
* @apiSchema {jsonschema=../schema/res.ListUsers.json} apiSuccess
*/


/**
* @api {patch} /user/:userid Patch User
* @apiVersion 1.0.0
* @apiName PATCH-/user/:userid
* @apiGroup User
* @apiPermission admin
*
* @apidescription
*   Update information about a user
*
* @apiParam {integer} userid param
*
*
* @apiSchema (Body) {jsonschema=../schema/req.body.PatchUser.json} apiParam
* @apiSchema {jsonschema=../schema/res.User.json} apiSuccess
*/


/**
* @api {get} /user/me Session Metadata
* @apiVersion 1.0.0
* @apiName GET-/user/me
* @apiGroup User
* @apiPermission user
*
* @apidescription
*   Return basic user information about the currently authenticated user
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Me.json} apiSuccess
*/


/**
* @api {get} /user/:userid Get User
* @apiVersion 1.0.0
* @apiName GET-/user/:userid
* @apiGroup User
* @apiPermission admin
*
* @apidescription
*   Return all information about a given user
*
* @apiParam {integer} userid param
*
*
*
* @apiSchema {jsonschema=../schema/res.User.json} apiSuccess
*/


/**
* @api {get} /websocket Schemas
* @apiVersion 1.0.0
* @apiName GET-/websocket
* @apiGroup Websockets
* @apiPermission public
*
* @apidescription
*   Return an object containing all the schemas used by the websocket router
*

*
*
*
* @apiSchema {jsonschema=../schema/res.Websocket.json} apiSuccess
*/
