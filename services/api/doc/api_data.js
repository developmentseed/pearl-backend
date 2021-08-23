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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>The human readable name of the AOI</p>"
          },
          {
            "group": "Body",
            "type": "Integer",
            "optional": false,
            "field": "checkpoint_id",
            "description": "<p>The checkpoint ID that created this AOI</p>"
          },
          {
            "group": "Body",
            "type": "Object",
            "optional": false,
            "field": "bounds",
            "description": "<p>GeoJSON Polygon</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "allowedValues": [
              "\"Polygon\""
            ],
            "optional": false,
            "field": "bounds.type",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "Unknown",
            "optional": false,
            "field": "bounds.coordinates",
            "description": "<p>undefined</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1432,\n    \"project_id\": 1,\n    \"name\": \"I'm an AOI\",\n    \"checkpoint_id\": 1,\n    \"storage\": true,\n    \"bookmarked\": false,\n    \"created\": \"<date>\",\n    \"bounds\": { \"GeoJSON\" }\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1432,\n    \"name\": \"I'm an AOI\",\n    \"checkpoint_id\": 1,\n    \"storage\": true,\n    \"bookmarked\": false\n    \"created\": \"<date>\",\n    \"bounds\": { \"GeoJSON \"}\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "AOI"
  },
  {
    "type": "post",
    "url": "/api/project/:projectid/aoi/:aoiid/patch/:patchid/upload",
    "title": "Upload Patch",
    "version": "1.0.0",
    "name": "UploadPatch",
    "group": "AOIGroup",
    "permission": [
      {
        "name": "admin",
        "title": "Admin",
        "description": "<p>The user must be an admin to use this endpoint</p>"
      }
    ],
    "description": "<p>Upload a new AOI Patch asset to the API</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": " HTTP/1.1 200 OK\n {\n     \"id\": 1432,\n     \"storage\": true,\n     \"created\": \"<date>\"\n     \"project_id\": 1,\n     \"aoi\": 1\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "AOIGroup"
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
    "parameter": {
      "fields": {
        "Query": [
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "limit",
            "defaultValue": "100",
            "description": "<p>Limit number of returned aois</p>"
          },
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "page",
            "defaultValue": "0",
            "description": "<p>The offset based on limit to return</p>"
          },
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "checkpointid",
            "defaultValue": "0",
            "description": "<p>Only return AOIs for a specific checkpoint</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "bookmarked",
            "defaultValue": "",
            "description": "<p>Filter AOIs based on bookmarked. Allowed 'true' or 'false'. By default returns all.</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "sort",
            "defaultValue": "desc",
            "description": "<p>Sorting order for listing AOIs based on created timestamp. Allowed 'desc' and 'asc'</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"total\": 1,\n    \"project_id\": 123,\n    \"aois\": [{\n        \"id\": 1432,\n        \"storage\": true,\n        \"bookmarked\": false,\n        \"created\": \"<date>\",\n        \"bounds\": { \"GeoJSON \"}\n    }]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": true,
            "field": "name",
            "description": "<p>The human readable name of the AOI</p>"
          },
          {
            "group": "Body",
            "type": "Boolean",
            "optional": true,
            "field": "bookmarked",
            "description": "<p>Has the checkpoint been bookmarked in the frontend</p>"
          },
          {
            "group": "Body",
            "type": "Integer[]",
            "optional": true,
            "field": "patches",
            "description": "<p>List of patch ids to apply on export undefined</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1432,\n    \"project_id\": 1,\n    \"name\": \"I'm an AOI\",\n    \"checkpoint_id\": 1,\n    \"bookmarked\": false,\n    \"storage\": true,\n    \"created\": \"<date>\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1432,\n    \"storage\": true,\n    \"created\": \"<date>\"\n    \"project_id\": 1,\n    \"aoi_id\": 1\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\ntrue",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": " HTTP/1.1 200 OK\n {\n     \"id\": 1432,\n     \"storage\": true,\n     \"created\": \"<date>\"\n     \"project_id\": 1,\n     \"aoi\": 1\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "AOIPatch"
  },
  {
    "type": "get",
    "url": "/api/project/:project/aoi/:aoiid/patch",
    "title": "List Patches",
    "version": "1.0.0",
    "name": "ListPatch",
    "group": "AOIPatch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return all patches for a given API</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"total\": 1,\n    \"project_id\": 123,\n    \"aoi_id\": 123\n    \"patches\": [{\n        \"id\": 1432,\n        \"storage\": true,\n        \"created\": \"<date>\"\n    }]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1432,\n    \"storage\": true,\n    \"created\": \"<date>\",\n    \"bounds\": { \"GeoJSON \"}\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "active",
            "description": "<p>Can the model be used for gpu instances</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "uid",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>Human-readable name of the Model</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"random_forest\"",
              "\"pytorch_example\"",
              "\"pytorch_solar\""
            ],
            "optional": false,
            "field": "model_type",
            "description": "<p>Underlying model type</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "model_zoom",
            "description": "<p>The tile zoom level to run inferences on</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer[]",
            "optional": false,
            "field": "model_inputshape",
            "description": "<p>undefined undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "classes",
            "description": "<p>Named output classes &amp; their associated colours undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "classes.name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "classes.color",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "storage",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Number[]/Null",
            "optional": false,
            "field": "bounds",
            "description": "<p>Recommended geographic area on which this model can be used</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "meta",
            "description": "<p>Generic key/value store for additional model metadata</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
    "groupTitle": "AOI"
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>The human readable name of the checkpoint</p>"
          },
          {
            "group": "Body",
            "type": "Integer",
            "optional": true,
            "field": "parent",
            "description": "<p>The ID of the parent checkpoint that was retrained off of</p>"
          },
          {
            "group": "Body",
            "type": "Object[]",
            "optional": true,
            "field": "analytics",
            "description": "<p>undefined undefined</p>"
          },
          {
            "group": "Body",
            "type": "Number",
            "optional": false,
            "field": "analytics.counts",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "Number",
            "optional": false,
            "field": "analytics.percent",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "Number",
            "optional": false,
            "field": "analytics.f1score",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "Object[]",
            "optional": false,
            "field": "classes",
            "description": "<p>Named output classes &amp; their associated colours undefined</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "classes.name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "classes.color",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "Null/Object[]",
            "optional": true,
            "field": "retrain_geoms",
            "description": "<p>Array of GeoJSON Multipoint geometries that were used for retraining. Length of geomms array must equals classes undefined</p>"
          },
          {
            "group": "Body",
            "type": "Null/Object[]",
            "optional": true,
            "field": "input_geoms",
            "description": "<p>Array of GeoJSON FeatureCollection that were input by the user. Length of this array must equals classes undefined</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1432,\n    \"parent\": 123,\n    \"instance_id\": 124,\n    \"storage\": true,\n    \"classes\": [ ... ],\n    \"name\": \"Named Checkpoint\",\n    \"bookmarked\": false,\n    \"created\": \"<date>\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1432,\n    \"name\": \"Checkpoint Name\",\n    \"parent\": 123,\n    \"classes\": [ ... ],\n    \"storage\": true,\n    \"created\": \"<date>\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "parameter": {
      "fields": {
        "Query": [
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "limit",
            "defaultValue": "100",
            "description": "<p>Limit number of returned checkpoints</p>"
          },
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "page",
            "defaultValue": "0",
            "description": "<p>The offset based on limit to return</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "bookmarked",
            "defaultValue": "",
            "description": "<p>Only return bookmarked checkpoints. true or false.</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "sort",
            "defaultValue": "desc",
            "description": "<p>Sorting order for listing checkpoints based on created timestamp. Allowed 'desc' and 'asc'</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"total\": 1,\n    \"instance_id\": 123,\n    \"checkpoints\": [{\n        \"id\": 1432,\n        \"parent\": 123,\n        \"name\": \"Checkpoint Name\",\n        \"storage\": true,\n        \"created\": \"<date>\",\n        \"bookmarked\": false\n    }]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": true,
            "field": "name",
            "description": "<p>Human readable name of the Checkpoint</p>"
          },
          {
            "group": "Body",
            "type": "Boolean",
            "optional": true,
            "field": "bookmarked",
            "description": "<p>Has the checkpoint been bookmarked in the frontend</p>"
          },
          {
            "group": "Body",
            "type": "Object[]",
            "optional": true,
            "field": "classes",
            "description": "<p>Named output classes &amp; their associated colours. NOTE: Patching cannot change the number of classes undefined</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "classes.name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "classes.color",
            "description": "<p>undefined</p>"
          }
        ]
      }
    },
    "description": "<p>Update a checkpoint</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1432,\n    \"instance_id\": 124,\n    \"parent\": 123,\n    \"storage\": true,\n    \"classes\": [ ... ],\n    \"name\": \"Named Checkpoint\",\n    \"bookmarked\": false,\n    \"created\": \"<date>\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1432,\n    \"name\": \"Checkpoint Name\",\n    \"classes\": [ ... ],\n    \"storage\": true,\n    \"created\": \"<date>\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Checkpoints"
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>Human-readable name of the Model</p>"
          },
          {
            "group": "Body",
            "type": "Boolean",
            "optional": false,
            "field": "active",
            "description": "<p>Can the model be used for gpu instances</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "allowedValues": [
              "\"random_forest\"",
              "\"pytorch_example\"",
              "\"pytorch_solar\""
            ],
            "optional": false,
            "field": "model_type",
            "description": "<p>Underlying model type</p>"
          },
          {
            "group": "Body",
            "type": "Integer",
            "optional": false,
            "field": "model_zoom",
            "description": "<p>The tile zoom level to run inferences on</p>"
          },
          {
            "group": "Body",
            "type": "Integer[]",
            "optional": false,
            "field": "model_inputshape",
            "description": "<p>undefined undefined</p>"
          },
          {
            "group": "Body",
            "type": "Object[]",
            "optional": false,
            "field": "classes",
            "description": "<p>Named output classes &amp; their associated colours undefined</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "classes.name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "classes.color",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "Number[]/Null",
            "optional": true,
            "field": "bounds",
            "description": "<p>Recommended geographic area on which this model can be used</p>"
          },
          {
            "group": "Body",
            "type": "Object",
            "optional": false,
            "field": "meta",
            "description": "<p>Generic key/value store for additional model metadata</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "active",
            "description": "<p>Can the model be used for gpu instances</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "uid",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>Human-readable name of the Model</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"random_forest\"",
              "\"pytorch_example\"",
              "\"pytorch_solar\""
            ],
            "optional": false,
            "field": "model_type",
            "description": "<p>Underlying model type</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "model_zoom",
            "description": "<p>The tile zoom level to run inferences on</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer[]",
            "optional": false,
            "field": "model_inputshape",
            "description": "<p>undefined undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "classes",
            "description": "<p>Named output classes &amp; their associated colours undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "classes.name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "classes.color",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "storage",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Number[]/Null",
            "optional": false,
            "field": "bounds",
            "description": "<p>Recommended geographic area on which this model can be used</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "meta",
            "description": "<p>Generic key/value store for additional model metadata</p>"
          }
        ]
      }
    },
    "description": "<p>Create a new model in the system</p>",
    "filename": "./index.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "status",
            "description": "<p>The HTTP Status Code of the response</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "message",
            "description": "<p>A human readable status message</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "active",
            "description": "<p>Can the model be used for gpu instances</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "uid",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>Human-readable name of the Model</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"random_forest\"",
              "\"pytorch_example\"",
              "\"pytorch_solar\""
            ],
            "optional": false,
            "field": "model_type",
            "description": "<p>Underlying model type</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "model_zoom",
            "description": "<p>The tile zoom level to run inferences on</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer[]",
            "optional": false,
            "field": "model_inputshape",
            "description": "<p>undefined undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "classes",
            "description": "<p>Named output classes &amp; their associated colours undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "classes.name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "classes.color",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "storage",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Number[]/Null",
            "optional": false,
            "field": "bounds",
            "description": "<p>Recommended geographic area on which this model can be used</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "meta",
            "description": "<p>Generic key/value store for additional model metadata</p>"
          }
        ]
      }
    },
    "filename": "./index.js",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"models\": [{\n        \"id\": 1,\n        \"created\": \"<date>\",\n        \"active\": true,\n        \"name\": \"NA Model\"\n    }]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "Boolean",
            "optional": true,
            "field": "storage",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "Number[]/Null",
            "optional": true,
            "field": "bounds",
            "description": "<p>Recommended geographic area on which this model can be used</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "active",
            "description": "<p>Can the model be used for gpu instances</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "uid",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>Human-readable name of the Model</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"random_forest\"",
              "\"pytorch_example\"",
              "\"pytorch_solar\""
            ],
            "optional": false,
            "field": "model_type",
            "description": "<p>Underlying model type</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "model_zoom",
            "description": "<p>The tile zoom level to run inferences on</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer[]",
            "optional": false,
            "field": "model_inputshape",
            "description": "<p>undefined undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "classes",
            "description": "<p>Named output classes &amp; their associated colours undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "classes.name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "classes.color",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "storage",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Number[]/Null",
            "optional": false,
            "field": "bounds",
            "description": "<p>Recommended geographic area on which this model can be used</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "meta",
            "description": "<p>Generic key/value store for additional model metadata</p>"
          }
        ]
      }
    },
    "description": "<p>Update a model</p>",
    "filename": "./index.js",
    "groupTitle": "Model"
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
    "description": "<p>Delete a project</p>",
    "filename": "./index.js",
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>Name of the Project</p>"
          },
          {
            "group": "Body",
            "type": "Integer",
            "optional": false,
            "field": "model_id",
            "description": "<p>Starter Model to use for project</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "mosaic",
            "description": "<p>Imagery to use with model</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "uid",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>Name of the Project</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "model_id",
            "description": "<p>Starter Model to use for project</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": true,
            "field": "model_name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "mosaic",
            "description": "<p>Imagery to use with model</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>undefined</p>"
          }
        ]
      },
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1432,\n    \"name\": \"Test Project\",\n    \"created\": \"<date>\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1,\n    \"name\": \"Test Project\",\n    \"created\": \"<date>\"\n    \"model_id\": 1,\n    \"mosaic\": \"naip.latest\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "parameter": {
      "fields": {
        "Query": [
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "limit",
            "defaultValue": "100",
            "description": "<p>Limit number of returned runs</p>"
          },
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "page",
            "defaultValue": "0",
            "description": "<p>The offset based on limit to return</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "sort",
            "defaultValue": "desc",
            "description": "<p>Sorting order for listing projects based on created timestamp. Allowed 'desc' and 'asc'. Default desc.</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "name",
            "defaultValue": "",
            "description": "<p>Filter projects that matches the name.</p>"
          }
        ]
      }
    },
    "description": "<p>Return a list of projects</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"total\": 1,\n    \"projects\": [{\n        \"id\": 1,\n        \"name\": 123,\n        \"created\": \"<date>\",\n        \"aois\": [{\n           \"id\": 1,\n           \"name\": \"aoi name\",\n           \"created\": \"<date>\",\n           \"storage\": false\n         }],\n         \"checkpoints\": []\n    }]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": true,
            "field": "name",
            "description": "<p>Name of the Project</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1432,\n    \"name\": \"Test Project\",\n    \"created\": \"<date>\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
          "content": "HTTP/1.1 200 OK\n{\n    \"version\": \"1.0.0\"\n    \"limits\": {\n        \"live_inference\": 100000000 (m^2)\n        \"max_inference\": 100000000 (m^2)\n        \"instance_window\": 600 (m secs)\n    }\n}",
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
    "filename": "./index.js",
    "groupTitle": "Share"
  },
  {
    "type": "get",
    "url": "/api/share/:shareuuid",
    "title": "Get AOI",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"id\": 1432,\n    \"name\": \"I'm an AOI\",\n    \"checkpoint_id\": 1,\n    \"storage\": true,\n    \"bookmarked\": false\n    \"created\": \"<date>\",\n    \"bounds\": { \"GeoJSON \"},\n    \"classes\": []\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "parameter": {
      "fields": {
        "Query": [
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "limit",
            "defaultValue": "100",
            "description": "<p>Limit number of returned aois</p>"
          },
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "page",
            "defaultValue": "0",
            "description": "<p>The offset based on limit to return</p>"
          },
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "checkpointid",
            "defaultValue": "0",
            "description": "<p>Only return AOIs for a specific checkpoint</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "bookmarked",
            "defaultValue": "",
            "description": "<p>Filter AOIs based on bookmarked. Allowed 'true' or 'false'. By default returns all.</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "sort",
            "defaultValue": "desc",
            "description": "<p>Sorting order for listing AOIs based on created timestamp. Allowed 'desc' and 'asc'</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"total\": 1,\n    \"project_id\": 123,\n    \"shares\": [{\n        \"uuid\": \"<uuid>\",\n        \"aoi_id\": 1432,\n        \"storage\": true,\n        \"created\": \"<date>\"\n    }]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"aoi_id\": 1432,\n    \"project_id\": 1,\n    \"storage\": false,\n    \"created\": \"<date>\",\n    \"patches\": []\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "filename": "./index.js",
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
    "filename": "./index.js",
    "groupTitle": "Share"
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
    "parameter": {
      "fields": {
        "Query": [
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "limit",
            "defaultValue": "100",
            "description": "<p>Limit number of returned runs</p>"
          },
          {
            "group": "Query",
            "type": "Integer",
            "optional": true,
            "field": "page",
            "defaultValue": "0",
            "description": "<p>The offset based on limit to return</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "filter",
            "defaultValue": "",
            "description": "<p>Filter a complete or partial username/email</p>"
          }
        ]
      }
    },
    "description": "<p>Return a list of users that have registered with the service</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"total\": 1,\n    \"users\": [{\n        \"id\": 1,\n        \"username\": \"example\",\n        \"email\": \"example@example.com\",\n        \"access\": \"user\",\n        \"flags\": { \"test_flag\": true }\n    }]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
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
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"username\": \"example\"\n    \"email\": \"example@example.com\",\n    \"access\": \"admin\",\n    \"flags\": {}\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "User"
  },
  {
    "type": "post",
    "url": "/api/project/:projectid/batch",
    "title": "Create Batch",
    "version": "1.0.0",
    "name": "CreateBatch",
    "group": "batch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Create a new batch</p>",
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "Integer",
            "optional": true,
            "field": "checkpoint_id",
            "description": "<p>The current checkpoint loaded on the instance</p>"
          },
          {
            "group": "Body",
            "type": "Object",
            "optional": false,
            "field": "bounds",
            "description": "<p>GeoJSON Polygon</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "allowedValues": [
              "\"Polygon\""
            ],
            "optional": false,
            "field": "bounds.type",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "Unknown",
            "optional": false,
            "field": "bounds.coordinates",
            "description": "<p>undefined</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "uid",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "project_id",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "updated",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer/Null",
            "optional": false,
            "field": "aoi",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "progress",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "completed",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": true,
            "field": "instance",
            "description": "<p>Instance ID of batch</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "bounds",
            "description": "<p>GeoJSON Polygon</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Polygon\""
            ],
            "optional": false,
            "field": "bounds.type",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Unknown",
            "optional": false,
            "field": "bounds.coordinates",
            "description": "<p>undefined</p>"
          }
        ]
      }
    },
    "filename": "./routes/batch.js",
    "groupTitle": "batch"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/batch/:batchid",
    "title": "Get Batch",
    "version": "1.0.0",
    "name": "GetBatch",
    "group": "batch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a single batch</p>",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "uid",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "project_id",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "updated",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer/Null",
            "optional": false,
            "field": "aoi",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "progress",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "completed",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": true,
            "field": "instance",
            "description": "<p>Instance ID of batch</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "bounds",
            "description": "<p>GeoJSON Polygon</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Polygon\""
            ],
            "optional": false,
            "field": "bounds.type",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Unknown",
            "optional": false,
            "field": "bounds.coordinates",
            "description": "<p>undefined</p>"
          }
        ]
      }
    },
    "filename": "./routes/batch.js",
    "groupTitle": "batch"
  },
  {
    "type": "get",
    "url": "/api/project/:projectid/batch",
    "title": "List Batch",
    "version": "1.0.0",
    "name": "ListBatch",
    "group": "batch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a list of all batches for a given user</p>",
    "parameter": {
      "fields": {
        "Query": [
          {
            "group": "Query",
            "type": "Integer",
            "size": "1 - 100",
            "optional": true,
            "field": "limit",
            "defaultValue": "100",
            "description": "<p>Limit number of returned items</p>"
          },
          {
            "group": "Query",
            "type": "Integer",
            "size": "0 - ∞",
            "optional": true,
            "field": "page",
            "defaultValue": "0",
            "description": "<p>The page, based on the limit, to return</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "allowedValues": [
              "\"desc\"",
              "\"asc\""
            ],
            "optional": true,
            "field": "order",
            "defaultValue": "asc",
            "description": "<p>Sort order to apply to results</p>"
          },
          {
            "group": "Query",
            "type": "Boolean",
            "optional": true,
            "field": "completed",
            "description": "<p>Filter by completed status</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "allowedValues": [
              "\"id\"",
              "\"created\"",
              "\"updated\"",
              "\"aoi\"",
              "\"name\"",
              "\"completed\""
            ],
            "optional": true,
            "field": "sort",
            "defaultValue": "created",
            "description": "<p>Field to sort order by</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "total",
            "description": "<p>Total number of items</p>"
          },
          {
            "group": "Success 200",
            "type": "Object[]",
            "optional": false,
            "field": "batch",
            "description": "<p>undefined undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "batch.id",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "batch.created",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "batch.updated",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "batch.aoi",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "batch.name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "batch.completed",
            "description": "<p>undefined</p>"
          }
        ]
      }
    },
    "filename": "./routes/batch.js",
    "groupTitle": "batch"
  },
  {
    "type": "patch",
    "url": "/api/project/:pid",
    "title": "Patch Batch",
    "version": "1.0.0",
    "name": "PatchBatch",
    "group": "batch",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Update a project</p>",
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "Integer",
            "optional": true,
            "field": "aoi",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "Integer",
            "optional": true,
            "field": "progress",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "Boolean",
            "optional": true,
            "field": "completed",
            "description": "<p>undefined</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "id",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "uid",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "project_id",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "created",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "updated",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer/Null",
            "optional": false,
            "field": "aoi",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "name",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": false,
            "field": "progress",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Boolean",
            "optional": false,
            "field": "completed",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Integer",
            "optional": true,
            "field": "instance",
            "description": "<p>Instance ID of batch</p>"
          },
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "bounds",
            "description": "<p>GeoJSON Polygon</p>"
          },
          {
            "group": "Success 200",
            "type": "String",
            "allowedValues": [
              "\"Polygon\""
            ],
            "optional": false,
            "field": "bounds.type",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Success 200",
            "type": "Unknown",
            "optional": false,
            "field": "bounds.coordinates",
            "description": "<p>undefined</p>"
          }
        ]
      }
    },
    "filename": "./routes/batch.js",
    "groupTitle": "batch"
  }
] });
