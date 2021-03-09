#! /usr/bin/env node

'use strict';

require('dotenv').config();

const fs = require('fs');
const Err = require('./lib/error');
const path = require('path');
const express = require('express');
const Busboy = require('busboy');
const { Param, fetchJSON } = require('./lib/util');
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const cors = require('cors');
const morgan = require('morgan');
const minify = require('express-minify');
const bodyparser = require('body-parser');
const { Validator, ValidationError } = require('express-json-validator-middleware');
const pkg = require('./package.json');

const argv = require('minimist')(process.argv, {
    boolean: ['prod'],
    string: ['port']
});

const Config = require('./lib/config');

if (require.main === module) {
    configure(argv);
}

function configure(argv = {}, cb) {
    Config.env(argv).then((config) => {
        return server(config, cb);
    });
}

/**
 * @apiDefine admin Admin
 *   The user must be an admin to use this endpoint
 */
/**
 * @apiDefine user User
 *   A user must be logged in to use this endpoint
 */
/**
 * @apiDefine public Public
 *   This API endpoint does not require authentication
 */

/**
 * @param {Config} config
 * @param {function} cb
 */
async function server(config, cb) {
    const app = express();
    const router = express.Router();

    const validator = new Validator({
        allErrors: true
    });

    const validate = validator.validate;

    try {
        await config.pool.query(String(fs.readFileSync(path.resolve(__dirname, 'schema.sql'))));
    } catch (err) {
        throw new Error(err);
    }

    const project = new (require('./lib/project').Project)(config);
    const proxy = new (require('./lib/proxy').Proxy)(config);
    const auth = new (require('./lib/auth').Auth)(config);
    const authtoken = new (require('./lib/auth').AuthToken)(config);
    const model = new (require('./lib/model').Model)(config);
    const instance = new (require('./lib/instance').Instance)(config);
    const checkpoint = new (require('./lib/checkpoint').CheckPoint)(config);
    const aoi = new (require('./lib/aoi').AOI)(config);
    const Mosaic = require('./lib/mosaic');

    app.disable('x-powered-by');
    app.use(cors({
        origin: true,
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));
    app.use(minify());

    app.use('/docs', express.static('./doc'));

    /**
     * @api {get} /api Get Metadata
     * @apiVersion 1.0.0
     * @apiName Meta
     * @apiGroup Server
     * @apiPermission public
     *
     * @apiDescription
     *     Return basic metadata about server configuration
     *
     *     limits.live_inference: The area in metres that can be live inferenced
     *     limits.max_inference: The max area in metres that can be inferenced
     *     limits.instance_window: The number of seconds a GPU Instance can be idle before termination
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "version": "1.0.0"
     *       "limits": {
     *           "live_inference": 1000 (m^2)
     *           "max_inference": 100000 (m^2)
     *           "instance_window": 1800 (secs)
     *       }
     *   }
     */
    app.get('/api', (req, res) => {
        return res.json({
            version: pkg.version,
            limits: {
                live_inference: 1000,
                max_inference: 100000,
                instance_window: 1800
            }
        });
    });

    /**
     * @api {get} /health Server Healthcheck
     * @apiVersion 1.0.0
     * @apiName Health
     * @apiGroup Server
     * @apiPermission public
     *
     * @apiDescription
     *     AWS ELB Healthcheck for the server
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "healthy": true,
     *       "message": "Good to go"
     *   }
     */
    app.get('/health', (req, res) => {
        return res.json({
            healthy: true,
            message: 'Good to go'
        });
    });

    app.use('/api', router);

    router.use(morgan('combined'));
    router.use(bodyparser.text());
    router.use(bodyparser.urlencoded({ extended: true }));
    router.use(bodyparser.json({
        limit: '50mb'
    }));


    /*
     * Validate Auth0 JWT tokens
     */
    const validateAuth0Token = jwt({
        secret: jwks.expressJwtSecret({
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 5,
            jwksUri: `${config.Auth0IssuerBaseUrl}/.well-known/jwks.json`
        }),
        audience: config.Audience,
        issuer: `${config.Auth0IssuerBaseUrl}/`,
        algorithms: ['RS256'],
        getToken: (req) => req.jwt.token
    });

    /*
     * Validate API tokens
     */
    const validateApiToken = async (req, res, next) => {
        try {
            req.auth = await authtoken.validate(req.jwt.token);
            req.auth.type = 'api';
            next();
        } catch (err) {
            return Err.respond(err, res);
        }
    };

    /*
     * Auth middleware
     */
    const requiresAuth = [
        (req, res, next) => {
            if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
                const token = req.headers.authorization.split(' ')[1];

                // Self-signed tokens are prefixed with 'api.'
                if (token.indexOf('api.') ===  0) {
                    req.jwt = {
                        type: 'api',
                        token: token.substr(4) // remove prefix
                    };
                } else {
                    req.jwt = {
                        type: 'auth0',
                        token: token
                    };
                }

                req.jwt.type === 'auth0' ? validateAuth0Token(req, res, next) : validateApiToken(req, res, next);
            } else {
                return Err.respond(new Err(401, null, 'Authentication Required'), res);
            }
        },
        (err, req, res, next) => {
            // Catch Auth0 errors
            if (err.name === 'UnauthorizedError') {
                return Err.respond(err.inner, res, 'Failed to validate token');
            }
            next();
        },
        async (req, res, next) => {
            if (req.jwt.type === 'auth0') {
                try {
                    // Load user from database, if exists
                    const user = await auth.user(req.user.sub, 'auth0_id');
                    req.auth = user;
                } catch (err) {
                    // Fetch user metadata from Auth0
                    const { body: auth0User } = await fetchJSON(`${config.Auth0IssuerBaseUrl}/userinfo`,{
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${req.jwt.token}`
                        }
                    });

                    // Create user, add to request
                    req.auth = await auth.create({
                        access: 'user',
                        auth0Id: auth0User.sub,
                        username: auth0User.name,
                        email: auth0User.email
                    });

                    // Set auth type
                    req.auth.type = 'auth0';
                }
            }
            next();
        }
    ];

    /**
     * @api {get} /api/token List Tokens
     * @apiVersion 1.0.0
     * @apiName ListTokens
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   [{
     *       "id": 1,
     *       "created": "<date>",
     *       "name": "Token Name"
     *   }]
     */
    router.get('/token', requiresAuth, async (req, res) => {
        try {
            return res.json(await authtoken.list(req.auth));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/token Create Token
     * @apiVersion 1.0.0
     * @apiName CreateToken
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiDescription
     *     Create a new API token to perform API requests with
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.token.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "username": "example"
     *       "email": "example@example.com",
     *       "access": "admin",
     *       "flags": {}
     *   }
     */
    router.post('/token',
        requiresAuth,
        validate({ body: require('./schema/req.body.token.json') }),
        async (req, res) => {
            try {
                return res.json(await authtoken.generate(req.auth, req.body.name));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {delete} /api/token/:id Delete Token
     * @apiVersion 1.0.0
     * @apiName DeleteToken
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiDescription
     *     Delete an existing token
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "status": 200,
     *       "message": "Token Deleted"
     *   }
     */
    router.delete('/token/:tokenid', requiresAuth, async (req, res) => {
        try {
            await await Param.int(req, 'tokenid');

            return res.json(await authtoken.delete(req.auth, req.params.tokenid));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/user List Users
     * @apiVersion 1.0.0
     * @apiName ListUsers
     * @apiGroup User
     * @apiPermission admin
     *
     * @apiSchema (Query) {jsonschema=./schema/req.query.user-list.json} apiParam
     *
     * @apiDescription
     *     Return a list of users that have registered with the service
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "total": 1,
     *       "users": [{
     *           "id": 1,
     *           "username": "example",
     *           "email": "example@example.com",
     *           "access": "user",
     *           "flags": { "test_flag": true }
     *       }]
     *   }
     */
    router.get(
        '/user',
        requiresAuth,
        validate({ query: require('./schema/req.query.user-list.json') }),
        async (req, res) => {
            try {
                const users = await auth.list(req.query);

                return res.json(users);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/user/me Get User Session Metadata
     * @apiVersion 1.0.0
     * @apiName self
     * @apiGroup User
     * @apiPermission user
     *
     * @apiDescription
     *     Return basic user information about the currently authenticated user
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "username": "example"
     *       "email": "example@example.com",
     *       "access": "admin",
     *       "flags": {}
     *   }
     */
    router.get('/user/me', requiresAuth, async (req, res) => {
        return res.json({
            username: req.auth.username,
            email: req.auth.email,
            access: req.auth.access,
            flags: req.auth.flags
        });
    });

    /**
     * @api {get} /api/project/:project/instance Create Instance
     * @apiVersion 1.0.0
     * @apiName CreateInstance
     * @apiGroup Instance
     * @apiPermission user
     *
     * @apiDescription
     *     Instruct the GPU pool to start a new model instance and return a time limited session
     *     token for accessing the websockets GPU API
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.instance.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1,
     *       "created": "<date",
     *       "project_id": 2,
     *       "url": "ws://<websocket-connection-url>",
     *       "token": "websocket auth token"
     *   }
     */
    router.post('/project/:projectid/instance',
        requiresAuth,
        validate({ body: require('./schema/req.body.instance.json') }),
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await project.has_auth(req.auth, req.params.projectid);

                req.body.project_id = req.params.projectid;
                const inst = await instance.create(req.auth, req.body);

                res.json(inst);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {patch} /api/project/:projectid/instance/:instance Patch Instance
     * @apiVersion 1.0.0
     * @apiName PatchInstance
     * @apiGroup Instance
     * @apiPermission admin
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.instance-patch.json} apiParam
     */
    router.patch(
        '/project/:projectid/instance/:instanceid',
        requiresAuth,
        validate({ body: require('./schema/req.body.instance-patch.json') }),
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'instanceid');

                await auth.is_admin(req);

                // TODO Allow patching
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/project List Projects
     * @apiVersion 1.0.0
     * @apiName ListProjects
     * @apiGroup Projects
     * @apiPermission user
     *
     * @apiSchema (Query) {jsonschema=./schema/req.query.project-list.json} apiParam
     *
     * @apiDescription
     *     Return a list of projects
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "total": 1,
     *       "projects": [{
     *           "id": 1,
     *           "name": 123,
     *           "created": "<date>"
     *       }]
     *   }
     */
    router.get('/project',
        requiresAuth,
        validate({ query: require('./schema/req.query.project-list.json') }),
        async (req, res) => {
            try {
                res.json(await project.list(req.auth.uid, req.query));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:projectid Get Project
     * @apiVersion 1.0.0
     * @apiName GetProject
     * @apiGroup Projects
     * @apiPermission user
     *
     * @apiDescription
     *     Return all information about a given project
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1,
     *       "name": "Test Project",
     *       "created": "<date>"
     *       "model_id": 1,
     *       "mosaic": "naip.latest"
     *   }
     */
    router.get('/project/:projectid', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');

            const proj = await project.has_auth(req.auth, req.params.projectid);
            delete proj.uid;

            return res.json(proj);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/project Create Project
     * @apiVersion 1.0.0
     * @apiName CreateProject
     * @apiGroup Projects
     * @apiPermission user
     *
     * @apiDescription
     *     Create a new project
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.project.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "name": "Test Project",
     *       "created": "<date>"
     *   }
     */
    router.post(
        '/project',
        requiresAuth,
        validate({ body: require('./schema/req.body.project.json') }),
        async (req, res) => {
            try {
                if (!req.body.mosaic || !Mosaic.list().mosaics.includes(req.body.mosaic)) throw new Err(400, null, 'Invalid Mosaic');

                return res.json(await project.create(req.auth.uid, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {patch} /api/project Patch Project
     * @apiVersion 1.0.0
     * @apiName PatchProject
     * @apiGroup Projects
     * @apiPermission user
     *
     * @apiDescription
     *     Update an existing Project
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.project-patch.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "name": "Test Project",
     *       "created": "<date>"
     *   }
     */
    router.patch(
        '/project/:projectid',
        requiresAuth,
        validate({ body: require('./schema/req.body.project-patch.json') }),
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await project.has_auth(req.auth, req.params.projectid);

                return res.json(await project.patch(req.params.projectid, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:projectid/instance List Instances
     * @apiVersion 1.0.0
     * @apiName ListInstances
     * @apiGroup Instance
     * @apiPermission user
     *
     * @apiSchema (Query) {jsonschema=./schema/req.query.instance-list.json} apiParam
     *
     * @apiDescription
     *     Return a list of instances. Note that users can only get their own instances and use of the `uid`
     *     field will be pinned to their own uid. Admins can filter by any uid or none.
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "total": 1,
     *       "instances": [{
     *           "id": 1,
     *           "uid": 123,
     *           "active": true,
     *           "created": "<date>"
     *       }]
     *   }
     */
    router.get('/project/:projectid/instance',
        requiresAuth,
        validate({ query: require('./schema/req.query.instance-list.json') }),
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await project.has_auth(req.auth, req.params.projectid);

                res.json(await instance.list(req.params.projectid, req.query));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:projectid/instance/:instanceid Get Instance
     * @apiVersion 1.0.0
     * @apiName GetInstance
     * @apiGroup Instance
     * @apiPermission user
     *
     * @apiDescription
     *     Return all information about a given instance
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1,
     *       "uid": 123,
     *       "active": true,
     *       "created": "<date>"
     *   }
     */
    router.get('/project/:projectid/instance/:instanceid', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'instanceid');

            res.json(await instance.has_auth(project, req.auth, req.params.projectid, req.params.instanceid));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:project/aoi/:aoiid Get AOI
     * @apiVersion 1.0.0
     * @apiName GetAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return all information about a given AOI
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "name": "I'm an AOI",
     *       "checkpoint_id": 1,
     *       "storage": true,
     *       "created": "<date>",
     *       "bounds": { "GeoJSON "}
     *   }
     */
    router.get('/project/:projectid/aoi/:aoiid', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            return res.json(await aoi.has_auth(project, req.auth, req.params.projectid, req.params.aoiid));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/tiles TileJSON AOI
     * @apiVersion 1.0.0
     * @apiName TileJSONAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return tilejson for a given AOI
     */
    router.get('/project/:projectid/aoi/:aoiid/tiles', requiresAuth, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');

            const a = await aoi.has_auth(project, req.auth, req.params.projectid, req.params.aoiid);
            if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

            const tiffurl = await aoi.url(a.id);

            req.url = '/cog/tilejson.json';

            req.query.url = tiffurl.origin + tiffurl.pathname;
            req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

            const response = await proxy.request(req);

            const tj = JSON.parse(response.body))

            // This is verbose as if the upstream JSON response changes
            // and includes the URL in another place, we leak an access cred
            res.json({

            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/tiles/:z/:x/:y.png MVT AOI
     * @apiVersion 1.0.0
     * @apiName MVTAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return a MVT for a given AOI
     */
    router.get('/project/:projectid/aoi/:aoiid/tiles', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await Param.int(req, 'z');
            await Param.int(req, 'x');
            await Param.int(req, 'y');

            throw new Err(501, null, 'MVT Not Yet Implemented');
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/project/:projectid/aoi/:aoiid/upload Upload AOI
     * @apiVersion 1.0.0
     * @apiName UploadAOI
     * @apiGroup AOI
     * @apiPermission admin
     *
     * @apiDescription
     *     Upload a new GeoTiff to the API
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "storage": true,
     *       "created": "<date>",
     *       "bounds": { "GeoJSON "}
     *   }
     */
    router.post('/project/:projectid/aoi/:aoiid/upload', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await auth.is_admin(req);

            const busboy = new Busboy({ headers: req.headers });

            const files = [];

            busboy.on('file', (fieldname, file) => {
                files.push(aoi.upload(req.params.aoiid, file));
            });

            busboy.on('finish', async () => {
                try {
                    return res.json(await aoi.get(req.params.aoiid));
                } catch (err) {
                    Err.respond(res, err);
                }
            });

            return req.pipe(busboy);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:projectid/aoi/:aoiid/download Download AOI
     * @apiVersion 1.0.0
     * @apiName DownloadAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return the aoi fabric geotiff
     */
    router.get('/project/:projectid/aoi/:aoiid/download', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'aoiid');
            await project.has_auth(req.auth, req.params.projectid);

            await aoi.download(req.params.aoiid, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:projectid/aoi List AOIs
     * @apiVersion 1.0.0
     * @apiName ListAOIs
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return all aois for a given instance
     *
     * @apiSchema (Query) {jsonschema=./schema/req.query.aoi.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "total": 1,
     *       "instance_id": 123,
     *       "aois": [{
     *           "id": 1432,
     *           "storage": true,
     *           "created": "<date>",
     *           "bounds": { "GeoJSON "}
     *       }]
     *   }
     */
    router.get(
        '/project/:projectid/aoi',
        requiresAuth,
        validate({ query: require('./schema/req.query.aoi.json') }),
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await project.has_auth(req.auth, req.params.projectid);

                return res.json(await aoi.list(req.params.projectid, req.query));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/project/:projectid/aoi Create AOI
     * @apiVersion 1.0.0
     * @apiName CreateAOI
     * @apiGroup AOI
     * @apiPermission admin
     *
     * @apiDescription
     *     Create a new AOI during an instance
     *     Note: this is an internal API that is called by the websocket GPU
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.aoi.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "project_id": 1,
     *       "name": "I'm an AOI",
     *       "checkpoint_id": 1,
     *       "storage": true,
     *       "created": "<date>",
     *       "bounds": { "GeoJSON" }
     *   }
     */
    router.post(
        '/project/:projectid/aoi',
        requiresAuth,
        validate({ body: require('./schema/req.body.aoi.json') }),
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await project.has_auth(req.auth, req.params.projectid);

                return res.json(await aoi.create(req.params.projectid, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {patch} /api/project/:projectid/aoi/:aoiid Patch AOI
     * @apiVersion 1.0.0
     * @apiName PatchAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Update an AOI
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.aoi-patch.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "project_id": 1,
     *       "name": "I'm an AOI",
     *       "checkpoint_id": 1,
     *       "storage": true,
     *       "created": "<date>",
     *       "bounds": { "GeoJSON" }
     *   }
     */
    router.patch(
        '/project/:projectid/aoi/:aoiid',
        requiresAuth,
        validate({ body: require('./schema/req.body.aoi-patch.json') }),
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');
                await aoi.has_auth(req.auth, req.params.projectid);

                return res.json(await aoi.patch(req.params.aoiid, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:projectid/checkpoint/:checkpointid Get Checkpoint
     * @apiVersion 1.0.0
     * @apiName GetCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Return a given checkpoint for a given instance
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "name": "Checkpoint Name",
     *       "classes": [ ... ],
     *       "storage": true,
     *       "created": "<date>"
     *   }
     */
    router.get(
        '/project/:projectid/checkpoint/:checkpointid',
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'checkpointid');

                return res.json(await checkpoint.has_auth(project, req.auth, req.params.projectid, req.params.checkpointid));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/project/:projectid/checkpoint/:checkpointid/upload Upload Checkpoint
     * @apiVersion 1.0.0
     * @apiName UploadCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission admin
     *
     * @apiDescription
     *     Upload a new checkpoint asset to the API
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "name": "Checkpoint Name",
     *       "classes": [ ... ],
     *       "storage": true,
     *       "created": "<date>"
     *   }
     */
    router.post('/project/:projectid/checkpoint/:checkpointid/upload', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'checkpointid');
            await auth.is_admin(req);

            const busboy = new Busboy({ headers: req.headers });

            const files = [];

            busboy.on('file', (fieldname, file) => {
                files.push(checkpoint.upload(req.params.checkpointid, file));
            });

            busboy.on('finish', async () => {
                try {
                    return res.json(await checkpoint.get(req.params.checkpointid));
                } catch (err) {
                    Err.respond(res, err);
                }
            });

            return req.pipe(busboy);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:projectid/checkpoint/:checkpointid/download Download Checkpoint
     * @apiVersion 1.0.0
     * @apiName DownloadCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Download a checkpoint asset from the API
     */
    router.get('/project/:projectid/checkpoint/:checkpointid/download', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'projectid');
            await Param.int(req, 'checkpointid');
            await project.get(req.auth, req.params.projectid);

            await checkpoint.download(req.params.checkpointid, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/project/:projectid/checkpoint List Checkpoints
     * @apiVersion 1.0.0
     * @apiName ListCheckpoints
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Return all checkpoints for a given instance
     *
     * @apiSchema (Query) {jsonschema=./schema/req.query.checkpoint.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "total": 1,
     *       "instance_id": 123,
     *       "checkpoints": [{
     *           "id": 1432,
     *           "name": "Checkpoint Name",
     *           "storage": true,
     *           "created": "<date>",
     *           "bookmarked": false
     *       }]
     *   }
     */
    router.get(
        '/project/:projectid/checkpoint',
        requiresAuth,
        validate({ query: require('./schema/req.query.checkpoint.json') }),
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await project.has_auth(req.auth, req.params.projectid);

                return res.json(await checkpoint.list(req.params.projectid, req.query));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/project/:projectid/checkpoint Create Checkpoint
     * @apiVersion 1.0.0
     * @apiName CreateCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission admin
     *
     * @apiDescription
     *     Create a new Checkpoint during an instance
     *     Note: this is an internal API that is called by the websocket GPU
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.checkpoint.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "instance_id": 124,
     *       "storage": true,
     *       "classes": [ ... ],
     *       "name": "Named Checkpoint",
     *       "bookmarked": false,
     *       "created": "<date>"
     *   }
     */
    router.post(
        '/project/:projectid/checkpoint',
        requiresAuth,
        validate({ body: require('./schema/req.body.checkpoint.json') }),
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await project.has_auth(req.auth, req.params.projectid);

                return res.json(await checkpoint.create(req.params.projectid, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {patch} /api/model/:modelid Patch Checkpoint
     * @apiVersion 1.0.0
     * @apiName PatchCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission admin
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.checkpoint-patch.json} apiParam
     *
     * @apiDescription
     *     Update a checkpoint
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "instance_id": 124,
     *       "storage": true,
     *       "classes": [ ... ],
     *       "name": "Named Checkpoint",
     *       "bookmarked": false,
     *       "created": "<date>"
     *   }
     */
    router.patch(
        '/project/:projectid/checkpoint/:checkpointid',
        requiresAuth,
        validate({ body: require('./schema/req.body.checkpoint-patch.json') }),
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'checkpointid');
                await checkpoint.has_auth(project, req.auth, req.params.projectid, req.params.checkpointid);

                return res.json(await checkpoint.patch(req.params.checkpointid, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/model Create Model
     * @apiVersion 1.0.0
     * @apiName CreateModel
     * @apiGroup Model
     * @apiPermission admin
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.model.json} apiParam
     *
     * @apiDescription
     *     Create a new model in the system
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1,
     *       "created": "<date>",
     *       "active": true,
     *       "uid": 1,
     *       "name": "HCMC Sentinel 2019 Unsupervised",
     *       "model_type": "keras_example",
     *       "model_inputshape": [100,100,4],
     *       "model_zoom" 17,
     *       "storage": true,
     *       "classes": [
     *           {"name": "Water", "color": "#0000FF"},
     *       ],
     *       "meta": {}
     *   }
     */
    router.post(
        '/model',
        requiresAuth,
        validate({ body: require('./schema/req.body.model.json') }),
        async (req, res) => {
            try {
                await auth.is_admin(req);

                res.json(await model.create(req.body, req.auth));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {patch} /api/model/:modelid Update Model
     * @apiVersion 1.0.0
     * @apiName PatchModel
     * @apiGroup Model
     * @apiPermission admin
     *
     * @apiSchema (Body) {jsonschema=./schema/req.body.model-patch.json} apiParam
     *
     * @apiDescription
     *     Update a model
     */
    router.patch(
        '/model/:modelid',
        requiresAuth,
        validate({ body: require('./schema/req.body.model-patch.json') }),
        async (req, res) => {
            try {
                await Param.int(req, 'modelid');

                await auth.is_admin(req);

                res.json(await model.patch(req.params.modelid, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/model/:modelid/upload UploadModel
     * @apiVersion 1.0.0
     * @apiName UploadModel
     * @apiGroup AOI
     * @apiPermission admin
     *
     * @apiDescription
     *     Upload a new model asset to the API
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1,
     *       "created": "<date>",
     *       "active": true,
     *       "uid": 1,
     *       "name": "HCMC Sentinel 2019 Unsupervised",
     *       "model_type": "keras_example",
     *       "model_inputshape": [100,100,4],
     *       "model_zoom": 17,
     *       "model_numparams": 563498,
     *       "storage": true,
     *       "classes": [
     *           {"name": "Water", "color": "#0000FF"},
     *       ],
     *       "meta": {}
     *   }
     */
    router.post('/model/:modelid/upload', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');
            await auth.is_admin(req);

            await model.get(req.params.modelid);

            const busboy = new Busboy({ headers: req.headers });

            const files = [];

            busboy.on('file', (fieldname, file) => {
                files.push(model.upload(req.params.modelid, file));
            });

            busboy.on('finish', async () => {
                try {
                    return res.json(await model.get(req.params.modelid));
                } catch (err) {
                    Err.respond(res, err);
                }
            });

            return req.pipe(busboy);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/model List Models
     * @apiVersion 1.0.0
     * @apiName ListModel
     * @apiGroup Model
     * @apiPermission user
     *
     * @apiDescription
     *     List information about a set of models
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "models": [{
     *           "id": 1,
     *           "created": "<date>",
     *           "active": true,
     *           "name": "NA Model"
     *       }]
     *   }
     */
    router.get(
        '/model',
        requiresAuth,
        async (req, res) => {
            try {
                res.json(await model.list());
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {delete} /api/model/:modelid Delete Model
     * @apiVersion 1.0.0
     * @apiName DeleteModel
     * @apiGroup Model
     * @apiPermission user
     *
     * @apiDescription
     *     Mark a model as inactive, and disallow subsequent instances of this model
     *     Note: this will not affect currently running instances of the model
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "status": 200,
     *       "message": "Model deleted"
     *   }
     */
    router.delete('/model/:modelid', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');
            await auth.is_admin(req);

            await model.delete(req.params.modelid);

            return res.status(200).json({
                status: 200,
                message: 'Model deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/model/:modelid Get Model
     * @apiVersion 1.0.0
     * @apiName GetModel
     * @apiGroup Model
     * @apiPermission user
     *
     * @apiDescription
     *     Return a all information for a single model
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1,
     *       "created": "<date>",
     *       "active": true,
     *       "uid": 1,
     *       "name": "HCMC Sentinel 2019 Unsupervised",
     *       "model_type": "keras_example",
     *       "model_inputshape": [100,100,4],
     *       "model_zoom": 17,
     *       "storage": true,
     *       "classes": [
     *           {"name": "Water", "color": "#0000FF"},
     *       ],
     *       "meta": {}
     *   }
     */
    router.get('/model/:modelid', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');

            res.json(await model.get(req.params.modelid));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/model/:modelid/download Download Model
     * @apiVersion 1.0.0
     * @apiName DownloadModel
     * @apiGroup Model
     * @apiPermission user
     *
     * @apiDescription
     *     Return the model itself
     */
    router.get('/model/:modelid/download', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'modelid');

            await model.download(req.params.modelid, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/mosaic List Mosaics
     * @apiVersion 1.0.0
     * @apiName ListMosaic
     * @apiGroup Mosaic
     * @apiPermission user
     *
     * @apiDescription
     *     Return a list of currently supported mosaic layers
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "mosaics": [
     *           "naip.latest"
     *       ]
     *   }
     */
    router.get('/mosaic', requiresAuth, async (req, res) => {
        try {
            return res.json(Mosaic.list());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/mosaic/:layer Get TileJson
     * @apiVersion 1.0.0
     * @apiName GetJson
     * @apiGroup Mosaic
     * @apiPermission user
     *
     * @apiDescription
     *     Return a TileJSON object for a given mosaic layer
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "tilejson": "2.2.0",
     *       "name": "naip.latest",
     *       "version": "1.0.0",
     *       "scheme": "xyz",
     *       "tiles": [ "http://localhost:8000/mosaic/naip.latest/tiles/{z}/{x}/{y}@1x?" ],
     *       "minzoom": 12,
     *       "maxzoom": 18,
     *       "bounds": [
     *           -124.81903735821528,
     *           24.49673997373884,
     *           -66.93084562551495,
     *           49.44192498524237
     *       ],
     *       "center": [ -95.87494149186512, 36.9693324794906, 12 ]
     *   }
     */
    router.get('/mosaic/:layer', requiresAuth, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            req.url = req.url + '/tilejson.json';

            await proxy.request(req, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/mosaic/:layer Get Tile
     * @apiVersion 1.0.0
     * @apiName GetTile
     * @apiGroup Mosaic
     * @apiPermission user
     *
     * @apiSchema (Query) {jsonschema=./schema/req.query.tile.json} apiParam
     *
     * @apiParam {Integer} z Mercator Z coordinate
     * @apiParam {Integer} x Mercator X coordinate
     * @apiParam {Integer} y Mercator Y coordinate
     * @apiParam {String} format Available values : png, npy, tif, jpg, jp2, webp, pngraw
     *
     * @apiDescription
     *     Return an aerial imagery tile for a given set of mercator coordinates
     *
     */
    router.get('/mosaic/:layer/tiles/:z/:x/:y.:format', requiresAuth, async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            await Param.int(req, 'z');
            await Param.int(req, 'x');
            await Param.int(req, 'y');

            await proxy.request(req, res);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/instance/:instanceid Self Instance
     * @apiVersion 1.0.0
     * @apiName GetInstance
     * @apiGroup Instance
     * @apiPermission admin
     *
     * @apiDescription
     *     A newly instantiated GPU Instance does not know what it's project id is. This API
     *     allows ONLY AN ADMIN TOKEN to fetch any instance, regardless of project
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1,
     *       "uid": 123,
     *       "active": true,
     *       "created": "<date>"
     *       "pod": { ... }
     *   }
     */
    router.get('/instance/:instanceid', requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'instanceid');
            await auth.is_admin(req);

            return res.json(await instance.get(req.params.instanceid));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    router.all('*', (req, res) => {
        return res.status(404).json({
            status: 404,
            message: 'API endpoint does not exist!'
        });
    });

    router.use((err, req, res, next) => {
        if (err instanceof ValidationError) {
            Err.respond(
                new Err(400, null, 'validation error'),
                res,
                err.validationErrors.body
            );

            next();
        } else {
            next(err);
        }
    });

    const srv = app.listen(config.Port, (err) => {
        if (err) return err;

        if (cb) return cb(srv, config.pool);

        console.error(`ok - running ${config.BaseUrl}`);
    });

}

module.exports = {
    server,
    configure,
    Config
};
