define({ "api": [
  {
    "type": "delete",
    "url": "/api/instance/:instance",
    "title": "Delete Instance",
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
    "filename": "./index.js",
    "groupTitle": "Instance"
  },
  {
    "type": "get",
    "url": "/api/instance/:instance",
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
    "filename": "./index.js",
    "groupTitle": "Instance"
  },
  {
    "type": "get",
    "url": "/api/instance",
    "title": "Create Instance",
    "version": "1.0.0",
    "name": "create",
    "group": "Instance",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Instruct the GPU pool to start a new model instance and return a time limited session token for accessing the websockets GPU API</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"url\": \"ws://<websocket-connection-url>\",\n    \"token\": \"websocket auth token\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Instance"
  },
  {
    "type": "get",
    "url": "/api/login",
    "title": "Session Info",
    "version": "1.0.0",
    "name": "get",
    "group": "Login",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return information about the currently logged in user</p>",
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
    "groupTitle": "Login"
  },
  {
    "type": "post",
    "url": "/api/login",
    "title": "Create Session",
    "version": "1.0.0",
    "name": "login",
    "group": "Login",
    "permission": [
      {
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Log a user into the service and create an authenticated cookie</p>",
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>username to authenticate with</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>password to authenticate with</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"username\": \"example\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Login"
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
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
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
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"status\": 200,\n    \"message\": \"Model deleted\"\n}",
          "type": "json"
        }
      ]
    },
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
              "\"keras_example\"",
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
            "field": "model_finetunelayer",
            "description": "<p>undefined</p>"
          },
          {
            "group": "Body",
            "type": "Integer",
            "optional": false,
            "field": "model_numparams",
            "description": "<p>undefined</p>"
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
            "type": "String",
            "optional": true,
            "field": "storage",
            "description": "<p>Blob storage location of the underlying model</p>"
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
            "type": "Object",
            "optional": false,
            "field": "meta",
            "description": "<p>Generic key/value store for additional model metadata</p>"
          }
        ]
      }
    },
    "description": "<p>Return a all information for a single model</p>",
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
    "filename": "./index.js",
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
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a TileJSON object for a given mosaic layer</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"tilejson\": \"2.2.0\",\n    \"name\": \"naip.latest\",\n    \"version\": \"1.0.0\",\n    \"scheme\": \"xyz\",\n    \"tiles\": [ \"http://localhost:8000/mosaic/naip.latest/tiles/{z}/{x}/{y}@1x?\" ],\n    \"minzoom\": 12,\n    \"maxzoom\": 18,\n    \"bounds\": [\n        -124.81903735821528,\n        24.49673997373884,\n        -66.93084562551495,\n        49.44192498524237\n    ],\n    \"center\": [ -95.87494149186512, 36.9693324794906, 12 ]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Mosaic"
  },
  {
    "type": "get",
    "url": "/api/mosaic/:layer",
    "title": "Get Tile",
    "version": "1.0.0",
    "name": "GetTile",
    "group": "Mosaic",
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
            "field": "scale",
            "defaultValue": "1",
            "description": "<p>Tile size scale. 1=256x256, 2=512x512...</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "allowedValues": [
              "\"first\"",
              "\"highest\"",
              "\"lowest\"",
              "\"mean\"",
              "\"median\"",
              "\"stdev\""
            ],
            "optional": true,
            "field": "pixel_selection",
            "defaultValue": "first",
            "description": "<p>The offset based on limit to return</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "bidx",
            "description": "<p>comma (',') delimited band indexes</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "expression",
            "description": "<p>rio-tiler's band math expression (e.g B1/B2)</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "nodata",
            "description": "<p>Overwrite internal Nodata value</p>"
          },
          {
            "group": "Query",
            "type": "Boolean",
            "optional": true,
            "field": "unscale",
            "description": "<p>Apply internal Scale/Offset</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "allowedValues": [
              "\"nearest\"",
              "\"bilinear\"",
              "\"cubic\"",
              "\"cubic_spline\"",
              "\"lanczos\"",
              "\"average\"",
              "\"mode\"",
              "\"gauss\"",
              "\"max\"",
              "\"min\"",
              "\"med\"",
              "\"q1\"",
              "\"q3\"",
              "\"rms\""
            ],
            "optional": true,
            "field": "resampling_method",
            "defaultValue": "nearest",
            "description": "<p>Resampling method.</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "rescale",
            "description": "<p>comma (',') delimited Min,Max bounds</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "optional": true,
            "field": "color_formula",
            "description": "<p>rio-color formula (info: https://github.com/mapbox/rio-color)</p>"
          },
          {
            "group": "Query",
            "type": "String",
            "allowedValues": [
              "\"above\"",
              "\"accent\"",
              "\"accent_r\"",
              "\"afmhot\"",
              "\"afmhot_r\"",
              "\"autumn\"",
              "\"autumn_r\"",
              "\"binary\"",
              "\"binary_r\"",
              "\"blues\"",
              "\"blues_r\"",
              "\"bone\"",
              "\"bone_r\"",
              "\"brbg\"",
              "\"brbg_r\"",
              "\"brg\"",
              "\"brg_r\"",
              "\"bugn\"",
              "\"bugn_r\"",
              "\"bupu\"",
              "\"bupu_r\"",
              "\"bwr\"",
              "\"bwr_r\"",
              "\"cfastie\"",
              "\"cividis\"",
              "\"cividis_r\"",
              "\"cmrmap\"",
              "\"cmrmap_r\"",
              "\"cool\"",
              "\"cool_r\"",
              "\"coolwarm\"",
              "\"coolwarm_r\"",
              "\"copper\"",
              "\"copper_r\"",
              "\"cubehelix\"",
              "\"cubehelix_r\"",
              "\"dark2\"",
              "\"dark2_r\"",
              "\"flag\"",
              "\"flag_r\"",
              "\"gist_earth\"",
              "\"gist_earth_r\"",
              "\"gist_gray\"",
              "\"gist_gray_r\"",
              "\"gist_heat\"",
              "\"gist_heat_r\"",
              "\"gist_ncar\"",
              "\"gist_ncar_r\"",
              "\"gist_rainbow\"",
              "\"gist_rainbow_r\"",
              "\"gist_stern\"",
              "\"gist_stern_r\"",
              "\"gist_yarg\"",
              "\"gist_yarg_r\"",
              "\"gnbu\"",
              "\"gnbu_r\"",
              "\"gnuplot\"",
              "\"gnuplot2\"",
              "\"gnuplot2_r\"",
              "\"gnuplot_r\"",
              "\"gray\"",
              "\"gray_r\"",
              "\"greens\"",
              "\"greens_r\"",
              "\"greys\"",
              "\"greys_r\"",
              "\"hot\"",
              "\"hot_r\"",
              "\"hsv\"",
              "\"hsv_r\"",
              "\"inferno\"",
              "\"inferno_r\"",
              "\"jet\"",
              "\"jet_r\"",
              "\"magma\"",
              "\"magma_r\"",
              "\"nipy_spectral\"",
              "\"nipy_spectral_r\"",
              "\"ocean\"",
              "\"ocean_r\"",
              "\"oranges\"",
              "\"oranges_r\"",
              "\"orrd\"",
              "\"orrd_r\"",
              "\"paired\"",
              "\"paired_r\"",
              "\"pastel1\"",
              "\"pastel1_r\"",
              "\"pastel2\"",
              "\"pastel2_r\"",
              "\"pink\"",
              "\"pink_r\"",
              "\"piyg\"",
              "\"piyg_r\"",
              "\"plasma\"",
              "\"plasma_r\"",
              "\"prgn\"",
              "\"prgn_r\"",
              "\"prism\"",
              "\"prism_r\"",
              "\"pubu\"",
              "\"pubu_r\"",
              "\"pubugn\"",
              "\"pubugn_r\"",
              "\"puor\"",
              "\"puor_r\"",
              "\"purd\"",
              "\"purd_r\"",
              "\"purples\"",
              "\"purples_r\"",
              "\"rainbow\"",
              "\"rainbow_r\"",
              "\"rdbu\"",
              "\"rdbu_r\"",
              "\"rdgy\"",
              "\"rdgy_r\"",
              "\"rdpu\"",
              "\"rdpu_r\"",
              "\"rdylbu\"",
              "\"rdylbu_r\"",
              "\"rdylgn\"",
              "\"rdylgn_r\"",
              "\"reds\"",
              "\"reds_r\"",
              "\"rplumbo\"",
              "\"schwarzwald\"",
              "\"seismic\"",
              "\"seismic_r\"",
              "\"set1\"",
              "\"set1_r\"",
              "\"set2\"",
              "\"set2_r\"",
              "\"set3\"",
              "\"set3_r\"",
              "\"spectral\"",
              "\"spectral_r\"",
              "\"spring\"",
              "\"spring_r\"",
              "\"summer\"",
              "\"summer_r\"",
              "\"tab10\"",
              "\"tab10_r\"",
              "\"tab20\"",
              "\"tab20_r\"",
              "\"tab20b\"",
              "\"tab20b_r\"",
              "\"tab20c\"",
              "\"tab20c_r\"",
              "\"terrain\"",
              "\"terrain_r\"",
              "\"twilight\"",
              "\"twilight_r\"",
              "\"twilight_shifted\"",
              "\"twilight_shifted_r\"",
              "\"viridis\"",
              "\"viridis_r\"",
              "\"winter\"",
              "\"winter_r\"",
              "\"wistia\"",
              "\"wistia_r\"",
              "\"ylgn\"",
              "\"ylgn_r\"",
              "\"ylgnbu\"",
              "\"ylgnbu_r\"",
              "\"ylorbr\"",
              "\"ylorbr_r\"",
              "\"ylorrd\"",
              "\"ylorrd_r\""
            ],
            "optional": true,
            "field": "color_map",
            "description": "<p>rio-tiler's colormap name</p>"
          },
          {
            "group": "Query",
            "type": "Boolean",
            "optional": true,
            "field": "return_mask",
            "defaultValue": "true",
            "description": "<p>Add mask to the output data.</p>"
          }
        ],
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
    "filename": "./index.js",
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
        "name": "user",
        "title": "User",
        "description": "<p>A user must be logged in to use this endpoint</p>"
      }
    ],
    "description": "<p>Return a list of currently supported mosaic layers</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"mosaics\": [\n        \"naip.latest\"\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Mosaic"
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
    "description": "<p>Return basic metadata about server configuration</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"version\": \"1.0.0\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "Server"
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
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>username to authenticate with</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>password to authenticate with</p>"
          }
        ]
      }
    },
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
    "filename": "./index.js",
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
    "filename": "./index.js",
    "groupTitle": "Token"
  },
  {
    "type": "post",
    "url": "/api/user",
    "title": "Create User",
    "version": "1.0.0",
    "name": "Create",
    "group": "User",
    "permission": [
      {
        "name": "public",
        "title": "Public",
        "description": "<p>This API endpoint does not require authentication</p>"
      }
    ],
    "parameter": {
      "fields": {
        "Body": [
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>username</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>password</p>"
          },
          {
            "group": "Body",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>email</p>"
          }
        ]
      }
    },
    "description": "<p>Create a new user</p>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"status\": 200,\n    \"message\": \"User Created\"\n}",
          "type": "json"
        }
      ]
    },
    "filename": "./index.js",
    "groupTitle": "User"
  },
  {
    "type": "get",
    "url": "/api/user",
    "title": "List Users",
    "version": "1.0.0",
    "name": "list",
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
  }
] });
