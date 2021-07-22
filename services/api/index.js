#! /usr/bin/env node

'use strict';

require('dotenv').config();

const Err = require('./lib/error');
const express = require('express');
const Busboy = require('busboy');
const { Param, fetchJSON } = require('./lib/util');
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const cors = require('cors');
const morgan = require('morgan');
const minify = require('express-minify');
const bodyparser = require('body-parser');
const { ValidationError } = require('express-json-validator-middleware');
const pkg = require('./package.json');

const argv = require('minimist')(process.argv, {
    boolean: ['prod', 'silent'],
    string: ['port'],
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

    const project = new (require('./lib/project').Project)(config);
    const proxy = new (require('./lib/proxy').Proxy)(config);
    const auth = new (require('./lib/auth').Auth)(config);
    const authtoken = new (require('./lib/auth').AuthToken)(config);
    const model = new (require('./lib/model').Model)(config);
    const instance = new (require('./lib/instance').Instance)(config);
    const checkpoint = new (require('./lib/checkpoint').CheckPoint)(config);
    const aoi = new (require('./lib/aoi').AOI)(config);
    const aoipatch = new (require('./lib/aoi-patch').AOIPatch)(config);
    const aoishare = new (require('./lib/aoi-share').AOIShare)(config);
    const Mosaic = require('./lib/mosaic');
    const schemas = new (require('./lib/schema'))();

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
     *           "live_inference": 100000000 (m^2)
     *           "max_inference": 100000000 (m^2)
     *           "instance_window": 600 (m secs)
     *       }
     *   }
     */
    app.get('/api', async (req, res) => {
        let podList = [];
        if (config.Environment !== 'local') {
            podList = await instance.kube.listPods();
        }

        let activePods;
        if (podList.length) {
            activePods = podList.filter((p) => {
                return p.status.phase === 'Running';
            });
        }

        return res.json({
            version: pkg.version,
            limits: {
                live_inference: 100000000,
                max_inference: 100000000,
                instance_window: 600,
                total_gpus: config.GpuCount,
                active_gpus: activePods ? activePods.length : null
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
    router.use(bodyparser.json({ limit: '50mb' }));

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
                return Err.respond(new Err(err.status, err.code, err.message), res);
            } else if (err instanceof ValidationError) {
                return Err.respond(new Err(400, null, 'validation error'), res, err.validationErrors.body);
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
     * @api {get} /api/schema List Schemas
     * @apiVersion 1.0.0
     * @apiName ListSchemas
     * @apiGroup Schemas
     * @apiPermission public
     *
     * @apiDescription
     *     List all JSON Schemas in use
     *     With no parameters this API will return a list of all the endpoints that have a form of schema validation
     *     If the url/method params are used, the schemas themselves are returned
     *
     *     Note: If url or method params are used, they must be used together
     *
     * @apiSchema (Query) {jsonschema=./schema/req.query.ListSchema.json} apiParam
     * @apiSchema {jsonschema=./schema/res.ListSchema.json} apiSuccess
     */
    router.get(
        ...await schemas.get('GET /schema', {
            query: 'req.query.ListSchema.json',
            body: 'res.ListSchema.json'
        }),
        async (req, res) => {
            try {
                if (req.query.url && req.query.method) {
                    res.json(schemas.query(req.query.method, req.query.url));
                } else if (req.query.url || req.query.method) {
                    throw new Err(400, null, 'url & method params must be used together');
                } else {
                    return res.json(schemas.list());
                }
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );


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
    router.get(
        ...await schemas.get('GET /token'), requiresAuth, async (req, res) => {
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
    router.post(
        ...await schemas.get('POST /token', {
            body: './req.body.token.json'
        }),
        requiresAuth,
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
    router.delete(
        ...await schemas.get('DELETE /token/:tokenid'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'tokenid');

                return res.json(await authtoken.delete(req.auth, req.params.tokenid));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

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
        ...await schemas.get('GET /user', {
            query: 'req.query.user-list.json'
        }),
        requiresAuth,
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
    router.get(
        ...await schemas.get('GET /user/me'),
        requiresAuth,
        async (req, res) => {
            return res.json({
                username: req.auth.username,
                email: req.auth.email,
                access: req.auth.access,
                flags: req.auth.flags
            });
        }
    );

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
    router.post(
        ...await schemas.get('POST /project/:projectid/instance', {
            body: 'req.body.instance.json'
        }),
        requiresAuth,
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
        ...await schemas.get('PATCH /project/:projectid/instance/:instanceid', {
            body: 'req.body.instance-patch.json'
        }),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'instanceid');
                await auth.is_admin(req);

                return res.json(await instance.patch(req.params.instanceid, req.body));
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
     *           "created": "<date>",
     *           "aois": [{
     *              "id": 1,
     *              "name": "aoi name",
     *              "created": "<date>",
     *              "storage": false
     *            }],
     *            "checkpoints": []
     *       }]
     *   }
     */
    router.get(
        ...await schemas.get('GET /project', {
            query: 'req.query.project-list.json'
        }),
        requiresAuth,
        async (req, res) => {
            try {
                const results = await project.list(req.auth.uid, req.query);
                if (results.projects && results.projects.length) {
                    for (let index = 0; index < results.projects.length; index++) {
                        const p = results.projects[index];
                        const aois = await aoi.list(p.id, { bookmarked: 'true' });
                        const checkpoints = await checkpoint.list(p.id, { bookmarked: 'true' });
                        // remove reduntant project id
                        delete aois.project_id;
                        delete checkpoints.project_id;
                        p['aois'] = aois.aois;
                        p['checkpoints'] = checkpoints.checkpoints;
                        p['model'] = {};
                        if (p.model_id) {
                            p['model'] = await model.get(p.model_id);
                            delete p.model_id;
                        }
                    }
                }
                res.json(results);
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
    router.get(
        ...await schemas.get('GET /project/:projectid'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');

                const proj = await project.has_auth(req.auth, req.params.projectid);
                delete proj.uid;

                const checkpoints = await checkpoint.list(req.params.projectid, { bookmarked: 'true' });
                // remove reduntant project id
                delete checkpoints.project_id;
                proj['checkpoints'] = checkpoints.checkpoints;

                return res.json(proj);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

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
        ...await schemas.get('POST /project', {
            body: 'req.body.project.json'
        }),
        requiresAuth,
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
     * @api {patch} /api/project/:projectid Patch Project
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
        ...await schemas.get('PATCH /project/:projectid', {
            body: 'req.body.project-patch.json'
        }),
        requiresAuth,
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
     * @api {delete} /api/project/:projectid Delete Project
     * @apiVersion 1.0.0
     * @apiName DeleteProject
     * @apiGroup Project
     * @apiPermission user
     *
     * @apiDescription
     *     Delete a project
     */
    router.delete(
        ...await schemas.get('DELETE /project/:projectid'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await project.has_auth(req.auth, req.params.projectid);

                const insts = await instance.list(req.params.projectid);
                for (const inst of insts.instances) {
                    if (inst.active) throw new Error(400, null, 'Cannot continue project deletion with active instance');
                    await instance.delete(inst.id);
                }

                // TODO - Add support for paging aois/checkpoints/instances for projects with > 100 features
                const aois = await aoi.list(req.params.projectid);
                aois.aois.forEach(async (a) => { await aoi.delete(a.id); });

                const chkpts = await checkpoint.list(req.params.projectid);
                chkpts.checkpoints.forEach(async (c) => { await checkpoint.delete(c.id); });

                return res.json(await project.delete(req.params.projectid));
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
    router.get(
        ...await schemas.get('GET /project/:projectid/instance', {
            query: 'req.query.instance-list.json'
        }),
        requiresAuth,
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
     *       "created": "<date>",
     *       "token": "<instance token>"
     *   }
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/instance/:instanceid'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'instanceid');

                res.json(await instance.has_auth(project, req.auth, req.params.projectid, req.params.instanceid));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

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
     *       "bookmarked": false
     *       "created": "<date>",
     *       "bounds": { "GeoJSON "}
     *   }
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/aoi/:aoiid'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');

                const a = await aoi.has_auth(project, req.auth, req.params.projectid, req.params.aoiid);

                const shares = await aoishare.list(req.params.projectid, {
                    aoi_id: a.id
                });

                a.shares = shares.shares;

                return res.json(a);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/share/:shareuuid Get AOI
     * @apiVersion 1.0.0
     * @apiName GetShare
     * @apiGroup Share
     * @apiPermission public
     *
     * @apiDescription
     *     Return all information about a given AOI Export using the UUID
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "name": "I'm an AOI",
     *       "checkpoint_id": 1,
     *       "storage": true,
     *       "bookmarked": false
     *       "created": "<date>",
     *       "bounds": { "GeoJSON "},
     *       "classes": []
     *   }
     */
    router.get(
        ...await schemas.get('GET /share/:shareuuid'),
        async (req, res) => {
            try {
                return res.json(await aoishare.get(req.params.shareuuid));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    const getAoiTileJSON = async (theAoi, req) => {
        const tiffurl = theAoi.hasOwnProperty('uuid') ? await aoishare.url(theAoi.uuid) : await aoi.url(theAoi.id)

        req.url = '/cog/tilejson.json';
        req.query.url = tiffurl.origin + tiffurl.pathname;
        req.query.url_params = Buffer.from(tiffurl.search).toString('base64');


        let tj, tiles;
        if (theAoi.hasOwnProperty('uuid')) {
            const response = await proxy.request(req);

            if (response.statusCode !== 200) throw new Err(500, new Error(response.body), 'Could not access upstream tiff');

            tj = response.body;

            // this is a share
            tiles = [
                `/api/share/${theAoi.uuid}/tiles/{z}/{x}/{y}`
            ]
        } else {
            const chkpt = await checkpoint.get(theAoi.checkpoint_id);
            const cmap = {};
            for (let i = 0; i < chkpt.classes.length; i++) {
                cmap[i] = chkpt.classes[i].color;
            }

            req.query.colormap = JSON.stringify(cmap);

            const response = await proxy.request(req);

            if (response.statusCode !== 200) throw new Err(500, new Error(response.body), 'Could not access upstream tiff');

            tj = response.body;

            tiles = [
                `/api/project/${req.params.projectid}/aoi/${req.params.aoiid}/tiles/{z}/{x}/{y}?colormap=${encodeURIComponent(JSON.stringify(cmap))}`
            ]
        }

        const aoiTileName = theAoi.hasOwnProperty('aoi_id') ? `aoi-${theAoi.aoi_id}` : `aoi-${theAoi.id}`;

        return {
            tilejson: tj.tilejson,
            name: aoiTileName,
            version: tj.version,
            schema: tj.scheme,
            tiles: tiles,
            minzoom: tj.minzoom,
            maxzoom: tj.maxzoom,
            bounds: tj.bounds,
            center: tj.center
        };
    };

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
    router.get(
        ...await schemas.get('GET /project/:projectid/aoi/:aoiid/tiles'),
        requiresAuth,
        async (req, res) => {
            if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');

                const a = await aoi.has_auth(project, req.auth, req.params.projectid, req.params.aoiid);
                if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

                res.json(await getAoiTileJSON(a, req));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/share/:shareuuid/tiles TileJSON
     * @apiVersion 1.0.0
     * @apiName TileJSON
     * @apiGroup Share
     * @apiPermission public
     *
     * @apiDescription
     *     Return tilejson for a given AOI using uuid
     */
    router.get(
        ...await schemas.get('GET /share/:shareuuid/tiles'),
        async (req, res) => {
            if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

            try {
                const a = await aoishare.get(req.params.shareuuid);
                if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

                res.json(await getAoiTileJSON(a, req));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/share/:shareuuid/tiles/:z/:x/:y Tiles
     * @apiVersion 1.0.0
     * @apiName Tile
     * @apiGroup Share
     * @apiPermission public
     *
     * @apiDescription
     *     Return a Tile for a given AOI using uuid
     */
    router.get(
        ...await schemas.get('GET /share/:shareuuid/tiles/:z/:x/:y'),
        async (req, res) => {
            try {
                await Param.int(req, 'z');
                await Param.int(req, 'x');
                await Param.int(req, 'y');

                const a = await aoishare.get(req.params.shareuuid);
                if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

                const tiffurl = await aoishare.url(req.params.shareuuid);
                req.url = `/cog/tiles/WebMercatorQuad/${req.params.z}/${req.params.x}/${req.params.y}@1x`;
                req.query.url = tiffurl.origin + tiffurl.pathname;
                req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

                await proxy.request(req, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/tiles/:z/:x/:y Tile AOI
     * @apiVersion 1.0.0
     * @apiName TileAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return a Tile for a given AOI
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/aoi/:aoiid/tiles/:z/:x/:y'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');
                await Param.int(req, 'z');
                await Param.int(req, 'x');
                await Param.int(req, 'y');

                const a = await aoi.has_auth(project, req.auth, req.params.projectid, req.params.aoiid);
                if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

                const tiffurl = await aoi.url(a.id);
                req.url = `/cog/tiles/WebMercatorQuad/${req.params.z}/${req.params.x}/${req.params.y}@1x`;
                req.query.url = tiffurl.origin + tiffurl.pathname;
                req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

                await proxy.request(req, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

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
    router.post(
        ...await schemas.get('POST /project/:projectid/aoi/:aoiid/upload'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');
                await auth.is_admin(req);

                const busboy = new Busboy({
                    headers: req.headers
                });

                const files = [];

                busboy.on('file', (fieldname, file) => {
                    files.push(aoi.upload(req.params.aoiid, file));
                });

                busboy.on('finish', async () => {
                    try {

                        const tiffurl = await aoi.url(req.params.aoiid);

                        const a = await aoi.get(req.params.aoiid);
                        const chkpt = await checkpoint.get(a.checkpoint_id);

                        const histo = [];
                        for (let i = 0; i <= chkpt.classes.length; i++) {
                            histo[i] = i + 1;
                        }

                        const pres = await proxy.request({
                            url: `/cog/metadata`,
                            query: {
                                url: String(tiffurl),
                                histogram_bins: histo.join(',')
                            },
                            body: {},
                            method: 'GET'
                        }, false);

                        const px_stats = {};
                        const totalpx = pres.body.width * pres.body.height;

                        for (let i = 0; i < chkpt.classes.length; i++) {
                            px_stats[i] = pres.body.statistics['1'].histogram[0][i] / totalpx;
                        }

                        return res.json(await aoi.patch(a.id, {
                            px_stats
                        }));
                    } catch (err) {
                        Err.respond(err, res);
                    }
                });

                return req.pipe(busboy);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:projectid/aoi/:aoiid/download/raw Download Raw AOI
     * @apiVersion 1.0.0
     * @apiName DownloadRawAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return the aoi fabric geotiff
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/aoi/:aoiid/download/raw'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');

                const a = await aoi.has_auth(project, req.auth, req.params.projectid, req.params.aoiid);
                if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

                await aoi.download(req.params.aoiid, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:projectid/aoi/:aoiid/download/color Download Color AOI
     * @apiVersion 1.0.0
     * @apiName DownloadColorAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return the colourized aoi fabric geotiff - but doesn't save it to share page
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/aoi/:aoiid/download/color'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');

                const a = await aoi.has_auth(project, req.auth, req.params.projectid, req.params.aoiid);
                if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

                const tiffurl = await aoi.url(a.id);

                const chkpt = await checkpoint.get(a.checkpoint_id);
                const cmap = {};
                for (let i = 0; i < chkpt.classes.length; i++) {
                    cmap[i] = chkpt.classes[i].color;
                }

                const patchurls = [];
                for (const patchid of a.patches) {
                    await aoipatch.has_auth(project, aoi, req.auth, req.params.projectid, req.params.aoiid, patchid);
                    patchurls.push(await aoipatch.url(req.params.aoiid, patchid));
                }

                req.method = 'POST';
                req.url = '/cog/cogify';

                req.body = {
                    input: tiffurl,
                    patches: patchurls,
                    colormap: cmap
                };

                await proxy.request(req, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

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
     *       "project_id": 123,
     *       "aois": [{
     *           "id": 1432,
     *           "storage": true,
     *           "bookmarked": false,
     *           "created": "<date>",
     *           "bounds": { "GeoJSON "}
     *       }]
     *   }
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/aoi', {
            query: 'req.query.aoi.json'
        }),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await project.has_auth(req.auth, req.params.projectid);

                const aois = await aoi.list(req.params.projectid, req.query);

                for (const a of aois.aois) {
                    const shares = await aoishare.list(req.params.projectid, {
                        aoi_id: a.id
                    });

                    a.shares = shares.shares;
                }

                return res.json(aois);
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
     *       "bookmarked": false,
     *       "created": "<date>",
     *       "bounds": { "GeoJSON" }
     *   }
     */
    router.post(
        ...await schemas.get('POST /project/:projectid/aoi', {
            body: 'req.body.aoi.json'
        }),
        requiresAuth,
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
     * @api {post} /api/project/:projectid/aoi/:aoiid/share Create Share
     * @apiVersion 1.0.0
     * @apiName ShareAOI
     * @apiGroup Share
     * @apiPermission user
     *
     * @apiDescription
     *     Export an AOI & it's patches to share
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "aoi_id": 1432,
     *       "project_id": 1,
     *       "storage": false,
     *       "created": "<date>",
     *       "patches": []
     *   }
     */
    router.post(
        ...await schemas.get('POST /project/:projectid/aoi/:aoiid/share'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');

                const a = await aoi.has_auth(project, req.auth, req.params.projectid, req.params.aoiid);
                if (!a.storage) throw new Err(404, null, 'AOI has not been uploaded');

                const chkpt = await checkpoint.get(a.checkpoint_id);
                const cmap = {};
                for (let i = 0; i < chkpt.classes.length; i++) {
                    cmap[i] = chkpt.classes[i].color;
                }

                const patchurls = [];
                for (const patchid of a.patches) {
                    await aoipatch.has_auth(project, aoi, req.auth, req.params.projectid, req.params.aoiid, patchid);
                    patchurls.push(await aoipatch.url(req.params.aoiid, patchid));
                }

                const share = await aoishare.create(a);

                if (config.TileUrl) {
                    const tiffurl = await aoi.url(a.id);
                    req.method = 'POST';
                    req.url = '/cog/cogify';

                    req.body = {
                        input: tiffurl,
                        patches: patchurls,
                        colormap: cmap
                    };

                    const pres = await proxy.request(req, true);
                    const up = await aoishare.upload(share.uuid, pres);
                    return res.json(up);
                } else {
                    return res.json(share);
                }
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {delete} /api/project/:projectid/aoi/:aoiid/share/:shareuuid Delete Share
     * @apiVersion 1.0.0
     * @apiName DeleteShare
     * @apiGroup Share
     * @apiPermission user
     *
     * @apiDescription
     *     Delete a Shared AOI
     */
    router.delete(
        ...await schemas.get('DELETE /project/:projectid/aoi/:aoiid/share/:shareuuid'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');
                await project.has_auth(req.auth, req.params.projectid);

                return res.json(await aoishare.delete(req.params.aoiid, req.params.shareuuid));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:projectid/share List Shares
     * @apiVersion 1.0.0
     * @apiName ListShares
     * @apiGroup Share
     * @apiPermission user
     *
     * @apiDescription
     *     Return all shares for a given project
     *
     * @apiSchema (Query) {jsonschema=./schema/req.query.aoi.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "total": 1,
     *       "project_id": 123,
     *       "shares": [{
     *           "uuid": "<uuid>",
     *           "aoi_id": 1432,
     *           "storage": true,
     *           "created": "<date>"
     *       }]
     *   }
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/share', {
            query: 'req.query.aoi.json'
        }),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await project.has_auth(req.auth, req.params.projectid);

                return res.json(await aoishare.list(req.params.projectid, req.query));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {delete} /api/project/:projectid/aoi/:aoiid Delete AOI
     * @apiVersion 1.0.0
     * @apiName DeleteAOI
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Delete an existing AOI
     */
    router.delete(
        ...await schemas.get('DELETE /project/:projectid/aoi/:aoiid'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');
                await aoi.has_auth(project, req.auth, req.params.projectid, req.params.aoiid);

                return res.json(await aoi.delete(req.params.aoiid));
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
     *       "bookmarked": false,
     *       "storage": true,
     *       "created": "<date>"
     *   }
     */
    router.patch(
        ...await schemas.get('PATCH /project/:projectid/aoi/:aoiid', {
            body: 'req.body.aoi-patch.json'
        }),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');
                await aoi.has_auth(project, req.auth, req.params.projectid, req.params.aoiid);

                return res.json(await aoi.patch(req.params.aoiid, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/patch List Patches
     * @apiVersion 1.0.0
     * @apiName ListPatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Return all patches for a given API
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "total": 1,
     *       "project_id": 123,
     *       "aoi_id": 123
     *       "patches": [{
     *           "id": 1432,
     *           "storage": true,
     *           "created": "<date>"
     *       }]
     *   }
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/aoi/:aoiid/patch'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');

                await aoi.has_auth(project, req.auth, req.params.projectid, req.params.aoiid);

                return res.json(await aoipatch.list(req.params.projectid, req.params.aoiid, req.query));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/project/:project/aoi/:aoiid/patch Create Patch
     * @apiVersion 1.0.0
     * @apiName CreatePatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Create a new Patch
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "storage": true,
     *       "created": "<date>"
     *       "project_id": 1,
     *       "aoi_id": 1
     *   }
     */
    router.post(
        ...await schemas.get('POST /project/:projectid/aoi/:aoiid/patch'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');

                await aoi.has_auth(project, req.auth, req.params.projectid, req.params.aoiid);

                return res.json(await aoipatch.create(req.params.projectid, req.params.aoiid));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {delete} /api/project/:project/aoi/:aoiid/patch/:patchid Delete Patch
     * @apiVersion 1.0.0
     * @apiName DeletePatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Delete a given patch
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   true
     */
    router.delete(
        ...await schemas.get('DELETE /project/:projectid/aoi/:aoiid/patch/:patchid'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');
                await Param.int(req, 'patchid');

                await aoipatch.has_auth(project, aoi, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);

                return res.json(await aoipatch.delete(req.params.aoiid, req.params.patchid));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/patch/:patchid Get Patch
     * @apiVersion 1.0.0
     * @apiName GetPatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Get a specific patch
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "storage": true,
     *       "created": "<date>"
     *       "project_id": 1,
     *       "aoi": 1
     *  }
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/aoi/:aoiid/patch/:patchid'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');
                await Param.int(req, 'patchid');

                return res.json(await aoipatch.has_auth(project, aoi, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/patch/:patchid/tiles TileJSON Patch
     * @apiVersion 1.0.0
     * @apiName TileJSONPatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Get the TileJSON for a given AOI Patch
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/aoi/:aoiid/patch/:patchid/tiles'),
        requiresAuth,
        async (req, res) => {
            if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');
                await Param.int(req, 'patchid');

                const a = await aoipatch.has_auth(project, auth, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);
                if (!a.storage) throw new Err(404, null, 'Patch has not been uploaded');

                const tiffurl = await aoipatch.url(req.params.aoiid, req.params.patchid);

                req.url = '/cog/tilejson.json';
                req.query.url = tiffurl.origin + tiffurl.pathname;
                req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

                const response = await proxy.request(req);

                if (response.statusCode !== 200) throw new Err(500, new Error(response.body), 'Could not access upstream tiff');

                const tj = JSON.parse(response.body);

                // This is verbose as if the upstream JSON response changes
                // and includes the URL in another place, we leak an access cred
                res.json({
                    tilejson: tj.tilejson,
                    name: `aoi-${req.params.aoiid}-patch-${req.params.patchid}`,
                    version: tj.version,
                    schema: tj.scheme,
                    tiles: [
                        `/api/project/${req.params.projectid}/aoi/${req.params.aoiid}/patch/${req.params.patchid}/tiles/{z}/{x}/{y}`
                    ],
                    minzoom: tj.minzoom,
                    maxzoom: tj.maxzoom,
                    bounds: tj.bounds,
                    center: tj.center
                });
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/patch/:patchid/tiles/:z/:x/:y Tile Patch
     * @apiVersion 1.0.0
     * @apiName TilePatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Return a Tile for a given AOI Patch
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/aoi/:aoiid/tiles/:z/:x/:y'),
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');
                await Param.int(req, 'patchid');
                await Param.int(req, 'z');
                await Param.int(req, 'x');
                await Param.int(req, 'y');

                const a = await aoipatch.has_auth(project, auth, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);
                if (!a.storage) throw new Err(404, null, 'Patch has not been uploaded');

                const tiffurl = await aoipatch.url(req.params.aoiid, req.params.patchid);
                req.url = `/cog/tiles/WebMercatorQuad/${req.params.z}/${req.params.x}/${req.params.y}@1x`;
                req.query.url = tiffurl.origin + tiffurl.pathname;
                req.query.url_params = Buffer.from(tiffurl.search).toString('base64');

                await proxy.request(req, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:project/aoi/:aoiid/patch/:patchid/download Download Patch
     * @apiVersion 1.0.0
     * @apiName DownloadPatch
     * @apiGroup AOIPatch
     * @apiPermission user
     *
     * @apiDescription
     *     Download a Tiff Patch
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/aoi/:aoiid/patch/:patchid/download'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');
                await Param.int(req, 'patchid');

                await aoipatch.has_auth(project, auth, req.auth, req.params.projectid, req.params.aoiid, req.params.patchid);

                await aoipatch.download(req.params.aoiid, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/project/:projectid/aoi/:aoiid/patch/:patchid/upload Upload Patch
     * @apiVersion 1.0.0
     * @apiName UploadPatch
     * @apiGroup AOIGroup
     * @apiPermission admin
     *
     * @apiDescription
     *     Upload a new AOI Patch asset to the API
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "storage": true,
     *       "created": "<date>"
     *       "project_id": 1,
     *       "aoi": 1
     *  }
     */
    router.post(
        ...await schemas.get('POST /project/:projectid/aoi/:aoiid/patch/:patchid/upload'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'aoiid');
                await Param.int(req, 'patchid');
                await auth.is_admin(req);

                const busboy = new Busboy({ headers: req.headers });

                const files = [];

                busboy.on('file', (fieldname, file) => {
                    files.push(aoipatch.upload(req.params.aoiid, req.params.patchid, file));
                });

                busboy.on('finish', async () => {
                    try {
                        return res.json(await aoipatch.get(req.params.patchid));
                    } catch (err) {
                        Err.respond(err, res);
                    }
                });

                return req.pipe(busboy);
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
     *       "parent": 123,
     *       "classes": [ ... ],
     *       "storage": true,
     *       "created": "<date>"
     *   }
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/checkpoint/:checkpointid'),
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
     * @api {get} /api/project/:project/checkpoint/:checkpointid/tiles TileJSON Checkpoint
     * @apiVersion 1.0.0
     * @apiName TileJSONCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Return tilejson for a given Checkpoint
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/checkpoint/:checkpointid/tiles'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'checkpointid');

                const c = await checkpoint.has_auth(project, req.auth, req.params.projectid, req.params.checkpointid);
                if (!c.storage) throw new Err(404, null, 'Checkpoint has not been uploaded');
                if (!c.center || !c.bounds) throw new Err(404, null, 'Checkpoint has no geometries to serve');

                res.json({
                    tilejson: '2.2.0',
                    name: `checkpoint-${req.params.checkpointid}`,
                    version: '1.0.0',
                    schema: 'xyz',
                    tiles: [
                        `/project/${req.params.projectid}/checkpoint/${req.params.checkpointid}/tiles/{z}/{x}/{y}.mvt`
                    ],
                    bounds: c.bounds,
                    center: c.center
                });
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/project/:project/checkpoint/:checkpointid/tiles/:z/:x/:y.mvt Tile Checkpoint
     * @apiVersion 1.0.0
     * @apiName TileCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Return a Tile for a given AOI
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/checkpoint/:checkpointid/tiles/:z/:x/:y.mvt'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'checkpointid');
                await Param.int(req, 'z');
                await Param.int(req, 'x');
                await Param.int(req, 'y');

                const c = await checkpoint.has_auth(project, req.auth, req.params.projectid, req.params.checkpointid);
                if (!c.storage) throw new Err(404, null, 'Checkpoint has not been uploaded');
                if (!c.center || !c.bounds) throw new Err(404, null, 'Checkpoint has no geometries to serve');

                return res.send(await checkpoint.mvt(req.params.checkpointid, req.params.z, req.params.x, req.params.y));

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
    router.post(
        ...await schemas.get('POST /project/:projectid/checkpoint/:checkpointid/upload'),
        requiresAuth,
        async (req, res) => {
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
                        Err.respond(err, res);
                    }
                });

                return req.pipe(busboy);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

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
    router.get(
        ...await schemas.get('GET /project/:projectid/checkpoint/:checkpointid/download'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'checkpointid');
                await project.has_auth(req.auth, req.params.projectid);

                await checkpoint.download(req.params.checkpointid, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

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
     *           "parent": 123,
     *           "name": "Checkpoint Name",
     *           "storage": true,
     *           "created": "<date>",
     *           "bookmarked": false
     *       }]
     *   }
     */
    router.get(
        ...await schemas.get('GET /project/:projectid/checkpoint', {
            query: 'req.query.checkpoint.json'
        }),
        requiresAuth,
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
     *       "parent": 123,
     *       "instance_id": 124,
     *       "storage": true,
     *       "classes": [ ... ],
     *       "name": "Named Checkpoint",
     *       "bookmarked": false,
     *       "created": "<date>"
     *   }
     */
    router.post(
        ...await schemas.get('POST /project/:projectid/checkpoint', {
            body: 'req.body.checkpoint.json'
        }),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await project.has_auth(req.auth, req.params.projectid);

                if (req.body.retrain_geoms && req.body.retrain_geoms.length !== req.body.classes.length) {
                    throw new Err(400, null, 'retrain_geoms array must be parallel with classes array');
                } else if (!req.body.retrain_geoms) {
                    // assuming that if retrain_geoms don't exist, input_geoms also don't exist
                    req.body.input_geoms = [];
                    req.body.retrain_geoms = req.body.classes.map(() => {
                        req.body.input_geoms.push({ type: 'GeometryCollection', 'geometries': [] });
                        return { type: 'MultiPoint', 'coordinates': [] };
                    });
                } else {
                    req.body.retrain_geoms = req.body.retrain_geoms.map((e) => {
                        if (!e || e.type !== 'MultiPoint') {
                            req.body.input_geoms.push({ type: 'GeometryCollection', 'geometries': [] });
                            return { type: 'MultiPoint', 'coordinates': [] };
                        }
                        return e;
                    });
                    req.body.input_geoms = req.body.input_geoms.map((e) => {
                        if (!e || e.type !== 'FeatureCollection') {
                            return { type: 'FeatureCollection', 'features': [] };
                        }
                        return e;
                    });
                }

                if (req.body.analytics && req.body.analytics.length !== req.body.analytics.length) {
                    throw new Err(400, null, 'analytics array must be parallel with classes array');
                }

                return res.json(await checkpoint.create(req.params.projectid, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {delete} /api/project/:projectid/checkpoint/:checkpointid Delete Checkpoint
     * @apiVersion 1.0.0
     * @apiName DeleteCheckpoint
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Delete an existing Checkpoint
     *     NOTE: This will also delete AOIs that depend on the given checkpoint
     */
    router.delete(
        ...await schemas.get('DELETE /project/:projectid/checkpoint/:checkpointid'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'projectid');
                await Param.int(req, 'checkpointid');
                await checkpoint.has_auth(project, req.auth, req.params.projectid, req.params.checkpointid);

                const aois = await aoi.list(req.params.projectid, { checkpointid: req.params.checkpointid });
                aois.aois.forEach(async (a) => { await aoi.delete(a.id); });

                return res.json(await checkpoint.delete(req.params.checkpointid));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {patch} /api/project/:projectid/checkpoint/:checkpointid Patch Checkpoint
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
     *       "parent": 123,
     *       "storage": true,
     *       "classes": [ ... ],
     *       "name": "Named Checkpoint",
     *       "bookmarked": false,
     *       "created": "<date>"
     *   }
     */
    router.patch(
        ...await schemas.get('PATCH /project/:projectid/checkpoint/:checkpointid', {
            body: 'req.body.checkpoint-patch.json'
        }),
        requiresAuth,
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
        ...await schemas.get('POST /model', {
            body: 'req.body.model.json'
        }),
        requiresAuth,
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
        ...await schemas.get('PATCH /model/:modelid', {
            body: 'req.body.model-patch.json'
        }),
        requiresAuth,
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
    router.post(
        ...await schemas.get('POST /model/:modelid/upload'),
        requiresAuth,
        async (req, res) => {
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
                        Err.respond(err, res);
                    }
                });

                return req.pipe(busboy);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

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
        ...await schemas.get('GET /model'),
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
    router.delete(
        ...await schemas.get('DELETE /model/:modelid'),
        requiresAuth,
        async (req, res) => {
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
        }
    );

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
    router.get(
        ...await schemas.get('GET /model/:modelid'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'modelid');

                res.json(await model.get(req.params.modelid));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

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
    router.get(
        ...await schemas.get('GET /model/:modelid/download'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'modelid');

                await model.download(req.params.modelid, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/mosaic List Mosaics
     * @apiVersion 1.0.0
     * @apiName ListMosaic
     * @apiGroup Mosaic
     * @apiPermission public
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
    router.get(
        ...await schemas.get('GET /mosaic'),
        async (req, res) => {
            try {
                return res.json(Mosaic.list());
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/mosaic/:layer Get TileJson
     * @apiVersion 1.0.0
     * @apiName GetJson
     * @apiGroup Mosaic
     * @apiPermission public
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
    router.get(
        ...await schemas.get('GET /mosaic/:layer'),
        async (req, res) => {
            if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

            try {
                req.url = req.url + '/tilejson.json';

                await proxy.request(req, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /mosaic/:layer/tiles/:z/:x/:y.:format Get Tile
     * @apiVersion 1.0.0
     * @apiName GetTile
     * @apiGroup Mosaic
     * @apiPermission public
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
    router.get(
        ...await schemas.get('GET /mosaic/:layer/tiles/:z/:x/:y.:format'),
        async (req, res) => {
            if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

            try {
                await Param.int(req, 'z');
                await Param.int(req, 'x');
                await Param.int(req, 'y');

                await proxy.request(req, res);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/instance/:instanceid Self Instance
     * @apiVersion 1.0.0
     * @apiName SelfInstance
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
    router.get(
        ...await schemas.get('GET /instance/:instanceid'),
        requiresAuth,
        async (req, res) => {
            try {
                await Param.int(req, 'instanceid');
                await auth.is_admin(req);

                return res.json(await instance.get(req.auth, req.params.instanceid));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {delete} /api/instance Deactivate Instances
     * @apiVersion 1.0.0
     * @apiName DeactivateInstance
     * @apiGroup Instance
     * @apiPermission admin
     *
     * @apiDescription
     *     Set all instances to active: false - used by the socket server upon initial api connection
     */
    router.delete(
        ...await schemas.get('DELETE /instance'),
        requiresAuth,
        async (req, res) => {
            try {
                await auth.is_admin(req);

                return res.json(await instance.reset());
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    router.all('*', (req, res) => {
        return res.status(404).json({
            status: 404,
            message: 'API endpoint does not exist!'
        });
    });

    router.use((err, req, res, next) => {
        if (err instanceof ValidationError) {
            return Err.respond(
                new Err(400, null, 'validation error'),
                res,
                err.validationErrors.body
            );
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
