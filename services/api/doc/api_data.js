define({ "api": [
  {
    "type": "post",
    "url": "/api/project/:projectid/aoi",
    "title": "Create AOI",
    "version": "1.0.0",
    "name": "CreateAOI",
    "group": "AOI",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new AOI during an instance Note: this is an internal API that is called by the websocket GPU</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "AOI"
  },
  {
    "type": "delete",
    "url": "/api/project/:projectid/aoi/:aoiid",
    "title": "Delete AOI",
    "version": "1.0.0",
    "name": "DeleteAOI",
    "group": "AOI",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Delete an existing AOI</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "AOI"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/aoi/:aoiid/download/color",
    "title": "Download Color AOI",
    "version": "1.0.0",
    "name": "DownloadColorAOI",
    "group": "AOI",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return the colourized aoi fabric geotiff - but doesn't save it to share page</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "AOI"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/aoi/:aoiid/download/raw",
    "title": "Download Raw AOI",
    "version": "1.0.0",
    "name": "DownloadRawAOI",
    "group": "AOI",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return the aoi fabric geotiff</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "AOI"
  },
  {
    "type": "get",
    "url": "/api/project/:project/aoi/:aoiid",
    "title": "Get AOI",
    "version": "1.0.0",
    "name": "GetAOI",
    "group": "AOI",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return all information about a given AOI</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "AOI"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/aoi",
    "title": "List AOIs",
    "version": "1.0.0",
    "name": "ListAOIs",
    "group": "AOI",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return all aois for a given instance</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "AOI"
  },
  {
    "type": "patch",
    "url": "/api/project/:projectid/aoi/:aoiid",
    "title": "Patch AOI",
    "version": "1.0.0",
    "name": "PatchAOI",
    "group": "AOI",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Update an AOI</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "AOI"
  },
  {
    "type": "post",
    "url": "/api/project/:project/aoi/:aoiid/patch",
    "title": "Create Patch",
    "version": "1.0.0",
    "name": "CreatePatch",
    "group": "AOIPatch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new Patch</p>",
    "filename": "./routes/aoi-patch.js",
    "groupTitle": "AOIPatch"
  },
  {
    "type": "delete",
    "url": "/api/project/:project/aoi/:aoiid/patch/:patchid",
    "title": "Delete Patch",
    "version": "1.0.0",
    "name": "DeletePatch",
    "group": "AOIPatch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Delete a given patch</p>",
    "filename": "./routes/aoi-patch.js",
    "groupTitle": "AOIPatch"
  },
  {
    "type": "get",
    "url": "/api/project/:project/aoi/:aoiid/patch/:patchid/download",
    "title": "Download Patch",
    "version": "1.0.0",
    "name": "DownloadPatch",
    "group": "AOIPatch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Download a Tiff Patch</p>",
    "filename": "./routes/aoi-patch.js",
    "groupTitle": "AOIPatch"
  },
  {
    "type": "get",
    "url": "/api/project/:project/aoi/:aoiid/patch/:patchid",
    "title": "Get Patch",
    "version": "1.0.0",
    "name": "GetPatch",
    "group": "AOIPatch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Get a specific patch</p>",
    "filename": "./routes/aoi-patch.js",
    "groupTitle": "AOIPatch"
  },
  {
    "type": "get",
    "url": "/api/project/:project/aoi/:aoiid/patch",
    "title": "List Patches",
    "version": "1.0.0",
    "name": "ListPatches",
    "group": "AOIPatch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return all patches for a given API</p>",
    "filename": "./routes/aoi-patch.js",
    "groupTitle": "AOIPatch"
  },
  {
    "type": "get",
    "url": "/api/project/:project/aoi/:aoiid/patch/:patchid/tiles",
    "title": "TileJSON Patch",
    "version": "1.0.0",
    "name": "TileJSONPatch",
    "group": "AOIPatch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Get the TileJSON for a given AOI Patch</p>",
    "filename": "./routes/aoi-patch.js",
    "groupTitle": "AOIPatch"
  },
  {
    "type": "get",
    "url": "/api/project/:project/aoi/:aoiid/patch/:patchid/tiles/:z/:x/:y",
    "title": "Tile Patch",
    "version": "1.0.0",
    "name": "TilePatch",
    "group": "AOIPatch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a Tile for a given AOI Patch</p>",
    "filename": "./routes/aoi-patch.js",
    "groupTitle": "AOIPatch"
  },
  {
    "type": "post",
    "url": "/api/project/:projectid/aoi/:aoiid/patch/:patchid/upload",
    "title": "Upload Patch",
    "version": "1.0.0",
    "name": "UploadPatch",
    "group": "AOIPatch",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Upload a new AOI Patch asset to the API</p>",
    "filename": "./routes/aoi-patch.js",
    "groupTitle": "AOIPatch"
  },
  {
    "type": "get",
    "url": "/api/project/:project/aoi/:aoiid/tiles/:z/:x/:y",
    "title": "Tile AOI",
    "version": "1.0.0",
    "name": "TileAOI",
    "group": "AOI",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a Tile for a given AOI</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "AOI"
  },
  {
    "type": "get",
    "url": "/api/project/:project/aoi/:aoiid/tiles",
    "title": "TileJSON AOI",
    "version": "1.0.0",
    "name": "TileJSONAOI",
    "group": "AOI",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return tilejson for a given AOI</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "AOI"
  },
  {
    "type": "post",
    "url": "/api/project/:projectid/aoi/:aoiid/upload",
    "title": "Upload AOI",
    "version": "1.0.0",
    "name": "UploadAOI",
    "group": "AOI",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Upload a new GeoTiff to the API</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "AOI"
  },
  {
    "type": "post",
    "url": "/api/model/:modelid/upload",
    "title": "UploadModel",
    "version": "1.0.0",
    "name": "UploadModel",
    "group": "AOI",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Upload a new model asset to the API</p>",
    "filename": "./routes/model.js",
    "groupTitle": "AOI"
  },
  {
    "type": "post",
    "url": "/api/project/:projectid/batch",
    "title": "Create Batch",
    "version": "1.0.0",
    "name": "CreateBatch",
    "group": "Batch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new batch</p>",
    "filename": "./routes/batch.js",
    "groupTitle": "Batch"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/batch/:batchid",
    "title": "Get Batch",
    "version": "1.0.0",
    "name": "GetBatch",
    "group": "Batch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a single batch</p>",
    "filename": "./routes/batch.js",
    "groupTitle": "Batch"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/batch",
    "title": "List Batch",
    "version": "1.0.0",
    "name": "ListBatch",
    "group": "Batch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a list of all batches for a given user</p>",
    "filename": "./routes/batch.js",
    "groupTitle": "Batch"
  },
  {
    "type": "patch",
    "url": "/api/project/:pid/batch/:batchid",
    "title": "Patch Batch",
    "version": "1.0.0",
    "name": "PatchBatch",
    "group": "Batch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Update a project</p>",
    "filename": "./routes/batch.js",
    "groupTitle": "Batch"
  },
  {
    "type": "post",
    "url": "/api/project/:projectid/checkpoint",
    "title": "Create Checkpoint",
    "version": "1.0.0",
    "name": "CreateCheckpoint",
    "group": "Checkpoints",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new Checkpoint during an instance Note: this is an internal API that is called by the websocket GPU</p>",
    "filename": "./routes/checkpoint.js",
    "groupTitle": "Checkpoints"
  },
  {
    "type": "delete",
    "url": "/api/project/:projectid/checkpoint/:checkpointid",
    "title": "Delete Checkpoint",
    "version": "1.0.0",
    "name": "DeleteCheckpoint",
    "group": "Checkpoints",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Delete an existing Checkpoint NOTE: This will also delete AOIs that depend on the given checkpoint</p>",
    "filename": "./routes/checkpoint.js",
    "groupTitle": "Checkpoints"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/checkpoint/:checkpointid/download",
    "title": "Download Checkpoint",
    "version": "1.0.0",
    "name": "DownloadCheckpoint",
    "group": "Checkpoints",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Download a checkpoint asset from the API</p>",
    "filename": "./routes/checkpoint.js",
    "groupTitle": "Checkpoints"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/checkpoint/:checkpointid",
    "title": "Get Checkpoint",
    "version": "1.0.0",
    "name": "GetCheckpoint",
    "group": "Checkpoints",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a given checkpoint for a given instance</p>",
    "filename": "./routes/checkpoint.js",
    "groupTitle": "Checkpoints"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/checkpoint/:checkpointid/osmtag",
    "title": "Get OSMTags",
    "version": "1.0.0",
    "name": "GetOSMTags",
    "group": "Checkpoints",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return OSMTags for a Checkpoint if they exist</p>",
    "filename": "./routes/checkpoint.js",
    "groupTitle": "Checkpoints"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/checkpoint",
    "title": "List Checkpoints",
    "version": "1.0.0",
    "name": "ListCheckpoints",
    "group": "Checkpoints",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return all checkpoints for a given instance</p>",
    "filename": "./routes/checkpoint.js",
    "groupTitle": "Checkpoints"
  },
  {
    "type": "patch",
    "url": "/api/project/:projectid/checkpoint/:checkpointid",
    "title": "Patch Checkpoint",
    "version": "1.0.0",
    "name": "PatchCheckpoint",
    "group": "Checkpoints",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Update a checkpoint</p>",
    "filename": "./routes/checkpoint.js",
    "groupTitle": "Checkpoints"
  },
  {
    "type": "get",
    "url": "/api/project/:project/checkpoint/:checkpointid/tiles/:z/:x/:y.mvt",
    "title": "Tile Checkpoint",
    "version": "1.0.0",
    "name": "TileCheckpoint",
    "group": "Checkpoints",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a Tile for a given AOI</p>",
    "filename": "./routes/checkpoint.js",
    "groupTitle": "Checkpoints"
  },
  {
    "type": "get",
    "url": "/api/project/:project/checkpoint/:checkpointid/tiles",
    "title": "TileJSON Checkpoint",
    "version": "1.0.0",
    "name": "TileJSONCheckpoint",
    "group": "Checkpoints",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return tilejson for a given Checkpoint</p>",
    "filename": "./routes/checkpoint.js",
    "groupTitle": "Checkpoints"
  },
  {
    "type": "post",
    "url": "/api/project/:projectid/checkpoint/:checkpointid/upload",
    "title": "Upload Checkpoint",
    "version": "1.0.0",
    "name": "UploadCheckpoint",
    "group": "Checkpoints",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Upload a new checkpoint asset to the API</p>",
    "filename": "./routes/checkpoint.js",
    "groupTitle": "Checkpoints"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/instance",
    "title": "Create Instance",
    "version": "1.0.0",
    "name": "CreateInstance",
    "group": "Instance",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Instruct the GPU pool to start a new model instance and return a time limited session token for accessing the websockets GPU API</p>",
    "filename": "./routes/instance.js",
    "groupTitle": "Instance"
  },
  {
    "type": "delete",
    "url": "/api/instance",
    "title": "Deactivate Instances",
    "version": "1.0.0",
    "name": "DeactivateInstance",
    "group": "Instance",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Set all instances to active: false - used by the socket server upon initial api connection</p>",
    "filename": "./routes/instance.js",
    "groupTitle": "Instance"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/instance/:instanceid",
    "title": "Get Instance",
    "version": "1.0.0",
    "name": "GetInstance",
    "group": "Instance",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return all information about a given instance</p>",
    "filename": "./routes/instance.js",
    "groupTitle": "Instance"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/instance",
    "title": "List Instances",
    "version": "1.0.0",
    "name": "ListInstances",
    "group": "Instance",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a list of instances. Note that users can only get their own instances and use of the <code>uid</code> field will be pinned to their own uid. Admins can filter by any uid or none.</p>",
    "filename": "./routes/instance.js",
    "groupTitle": "Instance"
  },
  {
    "type": "patch",
    "url": "/api/project/:projectid/instance/:instance",
    "title": "Patch Instance",
    "version": "1.0.0",
    "name": "PatchInstance",
    "group": "Instance",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "filename": "./routes/instance.js",
    "groupTitle": "Instance"
  },
  {
    "type": "get",
    "url": "/api/instance/:instanceid",
    "title": "Self Instance",
    "version": "1.0.0",
    "name": "SelfInstance",
    "group": "Instance",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>A newly instantiated GPU Instance does not know what it's project id is. This API allows ONLY AN ADMIN TOKEN to fetch any instance, regardless of project</p>",
    "filename": "./routes/instance.js",
    "groupTitle": "Instance"
  },
  {
    "type": "post",
    "url": "/api/model",
    "title": "Create Model",
    "version": "1.0.0",
    "name": "CreateModel",
    "group": "Model",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new model in the system</p>",
    "filename": "./routes/model.js",
    "groupTitle": "Model"
  },
  {
    "type": "delete",
    "url": "/api/model/:modelid",
    "title": "Delete Model",
    "version": "1.0.0",
    "name": "DeleteModel",
    "group": "Model",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Mark a model as inactive, and disallow subsequent instances of this model Note: this will not affect currently running instances of the model</p>",
    "filename": "./routes/model.js",
    "groupTitle": "Model"
  },
  {
    "type": "get",
    "url": "/api/model/:modelid/download",
    "title": "Download Model",
    "version": "1.0.0",
    "name": "DownloadModel",
    "group": "Model",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return the model itself</p>",
    "filename": "./routes/model.js",
    "groupTitle": "Model"
  },
  {
    "type": "get",
    "url": "/api/model/:modelid",
    "title": "Get Model",
    "version": "1.0.0",
    "name": "GetModel",
    "group": "Model",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a all information for a single model</p>",
    "filename": "./routes/model.js",
    "groupTitle": "Model"
  },
  {
    "type": "get",
    "url": "/api/model/:modelid/osmtag",
    "title": "Get OSMTags",
    "version": "1.0.0",
    "name": "GetOSMTags",
    "group": "Model",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return OSMTags for a Model if they exist</p>",
    "filename": "./routes/model.js",
    "groupTitle": "Model"
  },
  {
    "type": "get",
    "url": "/api/model",
    "title": "List Models",
    "version": "1.0.0",
    "name": "ListModel",
    "group": "Model",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>List information about a set of models</p>",
    "filename": "./routes/model.js",
    "groupTitle": "Model"
  },
  {
    "type": "patch",
    "url": "/api/model/:modelid",
    "title": "Update Model",
    "version": "1.0.0",
    "name": "PatchModel",
    "group": "Model",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Update a model</p>",
    "filename": "./routes/model.js",
    "groupTitle": "Model"
  },
  {
    "type": "get",
    "url": "/api/mosaic/:layer",
    "title": "Get TileJson",
    "version": "1.0.0",
    "name": "GetJson",
    "group": "Mosaic",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return a TileJSON object for a given mosaic layer</p>",
    "filename": "./routes/mosaic.js",
    "groupTitle": "Mosaic"
  },
  {
    "type": "get",
    "url": "/mosaic/:layer/tiles/:z/:x/:y.:format",
    "title": "Get Tile",
    "version": "1.0.0",
    "name": "GetTile",
    "group": "Mosaic",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Integer",
            "optional": false,
            "field": "z",
            "description": "<p>Mercator Z coordinate</p>"
          },
          {
            "group": "Parameter",
            "type": "Integer",
            "optional": false,
            "field": "x",
            "description": "<p>Mercator X coordinate</p>"
          },
          {
            "group": "Parameter",
            "type": "Integer",
            "optional": false,
            "field": "y",
            "description": "<p>Mercator Y coordinate</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "format",
            "description": "<p>Available values : png, npy, tif, jpg, jp2, webp, pngraw</p>"
          }
        ]
      }
    },
    "description": "<p>Return an aerial imagery tile for a given set of mercator coordinates</p>",
    "filename": "./routes/mosaic.js",
    "groupTitle": "Mosaic"
  },
  {
    "type": "get",
    "url": "/api/mosaic",
    "title": "List Mosaics",
    "version": "1.0.0",
    "name": "ListMosaic",
    "group": "Mosaic",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return a list of currently supported mosaic layers</p>",
    "filename": "./routes/mosaic.js",
    "groupTitle": "Mosaic"
  },
  {
    "type": "delete",
    "url": "/api/project/:projectid",
    "title": "Delete Project",
    "version": "1.0.0",
    "name": "DeleteProject",
    "group": "Project",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Archive a project</p>",
    "filename": "./routes/project.js",
    "groupTitle": "Project"
  },
  {
    "type": "post",
    "url": "/api/project",
    "title": "Create Project",
    "version": "1.0.0",
    "name": "CreateProject",
    "group": "Projects",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new project</p>",
    "filename": "./routes/project.js",
    "groupTitle": "Projects"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid",
    "title": "Get Project",
    "version": "1.0.0",
    "name": "GetProject",
    "group": "Projects",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return all information about a given project</p>",
    "filename": "./routes/project.js",
    "groupTitle": "Projects"
  },
  {
    "type": "post",
    "url": "/api/project",
    "title": "List Projects",
    "version": "1.0.0",
    "name": "ListProjects",
    "group": "Projects",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a list of projects</p>",
    "filename": "./routes/project.js",
    "groupTitle": "Projects"
  },
  {
    "type": "patch",
    "url": "/api/project/:projectid",
    "title": "Patch Project",
    "version": "1.0.0",
    "name": "PatchProject",
    "group": "Projects",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Update an existing Project</p>",
    "filename": "./routes/project.js",
    "groupTitle": "Projects"
  },
  {
    "type": "get",
    "url": "/health",
    "title": "Server Healthcheck",
    "version": "1.0.0",
    "name": "Health",
    "group": "Server",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>AWS ELB Healthcheck for the server</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"healthy\": true,\n    \"message\": \"Good to go\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Server"
  },
  {
    "type": "get",
    "url": "/api",
    "title": "Get Metadata",
    "version": "1.0.0",
    "name": "Meta",
    "group": "Server",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return basic metadata about server configuration</p> <pre><code>limits.live_inference: The area in metres that can be live inferenced limits.max_inference: The max area in metres that can be inferenced limits.instance_window: The number of seconds a GPU Instance can be idle before termination</code></pre>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"version\": \"1.0.0\"\n    \"limits\": {\n        \"live_inference\": 100000000 (m^2)\n        \"max_inference\": 200000000 (m^2)\n        \"instance_window\": 600 (m secs)\n    }\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Server"
  },
  {
    "type": "delete",
    "url": "/api/project/:projectid/aoi/:aoiid/share/:shareuuid",
    "title": "Delete Share",
    "version": "1.0.0",
    "name": "DeleteShare",
    "group": "Share",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Delete a Shared AOI</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "Share"
  },
  {
    "type": "get",
    "url": "/api/share/:shareuuid/download/color",
    "title": "Download Color AOI",
    "version": "1.0.0",
    "name": "DownloadColorAOI",
    "group": "Share",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return the colourized aoi fabric geotiff</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "Share"
  },
  {
    "type": "get",
    "url": "/api/share/:shareuuid/download/raw",
    "title": "Download Raw AOI",
    "version": "1.0.0",
    "name": "DownloadRawAOI",
    "group": "Share",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return the aoi fabric geotiff</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "Share"
  },
  {
    "type": "get",
    "url": "/api/share/:shareuuid",
    "title": "Get Share",
    "version": "1.0.0",
    "name": "GetShare",
    "group": "Share",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return all information about a given AOI Export using the UUID</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "Share"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/share",
    "title": "List Shares",
    "version": "1.0.0",
    "name": "ListShares",
    "group": "Share",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return all shares for a given project</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "Share"
  },
  {
    "type": "post",
    "url": "/api/project/:projectid/aoi/:aoiid/share",
    "title": "Create Share",
    "version": "1.0.0",
    "name": "ShareAOI",
    "group": "Share",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Export an AOI &amp; it's patches to share</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "Share"
  },
  {
    "type": "get",
    "url": "/api/share/:shareuuid/tiles/:z/:x/:y",
    "title": "Tiles",
    "version": "1.0.0",
    "name": "Tile",
    "group": "Share",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return a Tile for a given AOI using uuid</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "Share"
  },
  {
    "type": "get",
    "url": "/api/share/:shareuuid/tiles",
    "title": "TileJSON",
    "version": "1.0.0",
    "name": "TileJSON",
    "group": "Share",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "description": "<p>Return tilejson for a given AOI using uuid</p>",
    "filename": "./routes/aoi.js",
    "groupTitle": "Share"
  },
  {
    "type": "get",
    "url": "/api/tiles/:layer/:z/:x/:y.mvt",
    "title": "Get MVT",
    "version": "1.0.0",
    "name": "GetMVT",
    "group": "Tiles",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return an MVT for the given layer This endpoint will request the upstream vector tile and parse it in place Adding a <code>feature.properties.@ftype = '&lt;GeoJSON Geometry Type&gt;'</code> property</p>",
    "filename": "./routes/tiles.js",
    "groupTitle": "Tiles"
  },
  {
    "type": "get",
    "url": "/api/tiles",
    "title": "",
    "version": "1.0.0",
    "name": "ListTiles",
    "group": "Tiles",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a list of all supported Vector Tile Layers</p>",
    "filename": "./routes/tiles.js",
    "groupTitle": "Tiles"
  },
  {
    "type": "get",
    "url": "/api/tiles/:layer",
    "title": "TileJSON",
    "version": "1.0.0",
    "name": "TileJSONTiles",
    "group": "Tiles",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a TileJSON for the given layer</p>",
    "filename": "./routes/tiles.js",
    "groupTitle": "Tiles"
  },
  {
    "type": "post",
    "url": "/api/token",
    "title": "Create Token",
    "version": "1.0.0",
    "name": "CreateToken",
    "group": "Token",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new API token to perform API requests with</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"username\": \"example\"\n    \"email\": \"example@example.com\",\n    \"access\": \"admin\",\n    \"flags\": {}\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./routes/token.js",
    "groupTitle": "Token"
  },
  {
    "type": "delete",
    "url": "/api/token/:id",
    "title": "Delete Token",
    "version": "1.0.0",
    "name": "DeleteToken",
    "group": "Token",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Delete an existing token</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"status\": 200,\n    \"message\": \"Token Deleted\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./routes/token.js",
    "groupTitle": "Token"
  },
  {
    "type": "get",
    "url": "/api/token",
    "title": "List Tokens",
    "version": "1.0.0",
    "name": "ListTokens",
    "group": "Token",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[{\n    \"id\": 1,\n    \"created\": \"<date>\",\n    \"name\": \"Token Name\"\n}]",
          "type": "json"
        }
      ]
    },
    "filename": "./routes/token.js",
    "groupTitle": "Token"
  },
  {
    "type": "get",
    "url": "/api/user",
    "title": "List Users",
    "version": "1.0.0",
    "name": "ListUsers",
    "group": "User",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a list of users that have registered with the service</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"total\": 1,\n    \"users\": [{\n        \"id\": 1,\n        \"username\": \"example\",\n        \"email\": \"example@example.com\",\n        \"access\": \"user\",\n    }]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./routes/user.js",
    "groupTitle": "User"
  },
  {
    "type": "get",
    "url": "/api/user/me",
    "title": "Get User Session Metadata",
    "version": "1.0.0",
    "name": "self",
    "group": "User",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return basic user information about the currently authenticated user</p>",
    "filename": "./routes/user.js",
    "groupTitle": "User"
  }
] });
