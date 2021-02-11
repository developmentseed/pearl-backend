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
    string: ['postgres', 'port']
});

const { Pool } = require('pg');
const Config = require('./lib/config');

if (require.main === module) {
    configure(argv);
}

function configure(argv = {}, cb) {
    const config = Config.env(argv);
    return server(config, cb);
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

    let pool;

    let retry = 5;
    do {
        try {
            pool = new Pool({
                connectionString: config.Postgres
            });

            await pool.query('SELECT NOW()');
        } catch (err) {
            pool = false;

            if (retry === 0) {
                console.error('not ok - terminating due to lack of postgres connection');
                return process.exit(1);
            }

            retry--;
            console.error('not ok - unable to get postgres connection');
            console.error(`ok - retrying... (${5 - retry}/5)`);
            await sleep(5000);
        }
    } while (!pool);

    try {
        await pool.query(String(fs.readFileSync(path.resolve(__dirname, 'schema.sql'))));
    } catch (err) {
        throw new Error(err);
    }

    const project = new (require('./lib/project').Project)(pool, config);
    const proxy = new (require('./lib/proxy').Proxy)(config);
    const auth = new (require('./lib/auth').Auth)(pool);
    const authtoken = new (require('./lib/auth').AuthToken)(pool, config);
    const model = new (require('./lib/model').Model)(pool, config);
    const instance = new (require('./lib/instance').Instance)(pool, config);
    const checkpoint = new (require('./lib/checkpoint').CheckPoint)(pool, config);
    const aoi = new (require('./lib/aoi').AOI)(pool, config);
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
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "version": "1.0.0"
     *       "limits": {
     *           "live_inference": 1000 (m^2)
     *           "max_inference": 100000 (m^2)
     *       }
     *   }
     */
    app.get('/api', (req, res) => {
        return res.json({
            version: pkg.version,
            limits: {
                live_inference: 1000,
                max_inference: 100000
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
     * @apiSchema (Body) {jsonschema=./schema/token.json} apiParam
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
        validate({ body: require('./schema/token.json') }),
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
        Param.int(req, res, 'tokenid');

        try {
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
     * @apiSchema (Query) {jsonschema=./schema/user-list.query.json} apiParam
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
        validate({ query: require('./schema/user-list.query.json') }),
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
     * @api {get} /api/instance Create Instance
     * @apiVersion 1.0.0
     * @apiName CreateInstance
     * @apiGroup Instance
     * @apiPermission user
     *
     * @apiDescription
     *     Instruct the GPU pool to start a new model instance and return a time limited session
     *     token for accessing the websockets GPU API
     *
     * @apiSchema (Body) {jsonschema=./schema/instance.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1,
     *       "created": "<date",
     *       "model_id": 1,
     *       "project_id": 2,
     *       "mosaic": "naip.latest",
     *       "url": "ws://<websocket-connection-url>",
     *       "token": "websocket auth token"
     *   }
     */
    router.post('/instance',
        requiresAuth,
        validate({ body: require('./schema/instance.json') }),
        async (req, res) => {
            try {
                if (!req.body.mosaic || !Mosaic.list().mosaics.includes(req.body.mosaic)) throw new Error(400, null, 'Invalid Mosaic');

                const inst = await instance.create(req.auth, req.body);

                res.json(inst);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {patch} /api/instance/:instance Patch Instance
     * @apiVersion 1.0.0
     * @apiName PatchInstance
     * @apiGroup Instance
     * @apiPermission admin
     *
     * @apiSchema (Body) {jsonschema=./schema/instance-patch.json} apiParam
     */
    router.patch(
        '/instance/:instanceid',
        requiresAuth,
        validate({ body: require('./schema/instance.json') }),
        async (req, res) => {
            Param.int(req, res, 'instanceid');

            try {
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
     * @apiSchema (Query) {jsonschema=./schema/project-list.query.json} apiParam
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
    router.get('/project', requiresAuth, async (req, res) => {
        try {
            res.json(await project.list(req.auth.uid, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

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
     *   }
     */
    router.get('/project/:projectid', requiresAuth, async (req, res) => {
        Param.int(req, res, 'projectid');

        try {
            const proj = await project.get(req.params.projectid);

            if (req.auth.access !== 'admin' && req.auth.uid !== proj.uid) throw new Err(401, null, 'Cannot access a project you are not the owner of');

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
     * @apiGroup Project
     * @apiPermission user
     *
     * @apiDescription
     *     Create a new project
     *
     * @apiSchema (Body) {jsonschema=./schema/project.json} apiParam
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
        validate({ body: require('./schema/project.json') }),
        async (req, res) => {
            try {
                return res.json(await project.create(req.auth.uid, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/instance List Instances
     * @apiVersion 1.0.0
     * @apiName ListInstances
     * @apiGroup Instance
     * @apiPermission user
     *
     * @apiSchema (Query) {jsonschema=./schema/instance-list.query.json} apiParam
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
     *           "created": "<date>",
     *           "model_id": 1,
     *           "mosaic": "naip.latest"
     *       }]
     *   }
     */
    router.get('/instance', requiresAuth, async (req, res) => {
        try {
            // Only admins can see all running instances
            if (req.auth.access !== 'admin') req.query.uid = req.auth.uid;

            res.json(await instance.list(req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/instance/:instance Get Instance
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
     *       "model_id": 1,
     *       "mosaic": "naip.latest"
     *   }
     */
    router.get('/instance/:instanceid', requiresAuth, async (req, res) => {
        Param.int(req, res, 'instanceid');

        try {
            const inst = await instance.get(req.params.instanceid);
            if (req.auth.access !== 'admin' && req.auth.uid !== inst.uid) throw new Error(403, null, 'Cannot access resources you don\'t own');

            return res.json(inst);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/instance/:instanceid/aoi/:aoiid Get AOI
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
     *       "storage": true,
     *       "created": "<date>",
     *       "bounds": { "GeoJSON "}
     *   }
     */
    router.get('/instance/:instanceid/aoi/:aoiid', requiresAuth, async (req, res) => {
        Param.int(req, res, 'instanceid');
        Param.int(req, res, 'aoiid');

        try {
            const inst = await instance.get(req.params.instanceid);
            if (req.auth.access !== 'admin' && req.auth.uid !== inst.uid) throw new Error(403, null, 'Cannot access resources you don\'t own');

            return res.json(await aoi.get(req.params.aoiid));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {post} /api/instance/:instanceid/aoi/:aoiid/upload Upload AOI
     * @apiVersion 1.0.0
     * @apiName UploadAOI
     * @apiGroup AOI
     * @apiPermission user
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
    router.post('/instance/:instanceid/aoi/:aoiid/upload', requiresAuth, async (req, res) => {
        Param.int(req, res, 'instanceid');
        Param.int(req, res, 'aoiid');

        try {
            const inst = await instance.get(req.params.instanceid);
            if (req.auth.access !== 'admin' && req.auth.uid !== inst.uid) throw new Error(403, null, 'Cannot access resources you don\'t own');

            const busboy = new Busboy({ headers: req.headers });

            const files = [];

            busboy.on('file', (fieldname, file, filename) => {
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
     * @api {get} /api/instance/:instanceid/aoi List AOIs
     * @apiVersion 1.0.0
     * @apiName ListAOIs
     * @apiGroup AOI
     * @apiPermission user
     *
     * @apiDescription
     *     Return all aois for a given instance
     *
     * @apiSchema (Query) {jsonschema=./schema/aoi.query.json} apiParam
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
        '/instance/:instanceid/aoi',
        requiresAuth,
        validate({ query: require('./schema/aoi.query.json') }),
        async (req, res) => {
            Param.int(req, res, 'instanceid');

            try {
                const inst = await instance.get(req.params.instanceid);
                if (req.auth.access !== 'admin' && req.auth.uid !== inst.uid) throw new Error(403, null, 'Cannot access resources you don\'t own');

                return res.json(await aoi.list(req.params.instanceid, req.query));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/instance/:instance/aoi Create AOI
     * @apiVersion 1.0.0
     * @apiName CreateAOI
     * @apiGroup AOI
     * @apiPermission admin
     *
     * @apiDescription
     *     Create a new AOI during an instance
     *     Note: this is an internal API that is called by the websocket GPU
     *
     * @apiSchema (Body) {jsonschema=./schema/aoi.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "instance_id": 124,
     *       "storage": true,
     *       "created": "<date>",
     *       "bounds": { "GeoJSON" }
     *   }
     */
    router.post(
        '/instance/:instanceid/aoi',
        requiresAuth,
        validate({ body: require('./schema/aoi.json') }),
        async (req, res) => {
            Param.int(req, res, 'instanceid');

            try {
                const inst = await instance.get(req.params.instanceid);
                if (req.auth.access !== 'admin' && req.auth.uid !== inst.uid) throw new Error(403, null, 'Cannot access resources you don\'t own');

                return res.json(await aoi.create(req.params.instanceid, req.body));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/instance/:instance/aoi List Checkpoints
     * @apiVersion 1.0.0
     * @apiName ListCheckpoints
     * @apiGroup Checkpoints
     * @apiPermission user
     *
     * @apiDescription
     *     Return all checkpoints for a given instance
     *
     * @apiSchema (Query) {jsonschema=./schema/checkpoint.query.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "total": 1,
     *       "instance_id": 123,
     *       "checkpoints": [{
     *           "id": 1432,
     *           "storage": true,
     *           "created": "<date>"
     *       }]
     *   }
     */
    router.get(
        '/instance/:instanceid/checkpoint',
        requiresAuth,
        validate({ query: require('./schema/checkpoint.query.json') }),
        async (req, res) => {
            Param.int(req, res, 'instanceid');

            try {
                const inst = await instance.get(req.params.instanceid);
                if (req.auth.access !== 'admin' && req.auth.uid !== inst.uid) throw new Error(403, null, 'Cannot access resources you don\'t own');

                return res.json(await checkpoint.list(req.params.instanceid, req.query));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {get} /api/instance/:instance/checkpoint Create Checkpoint
     * @apiVersion 1.0.0
     * @apiName CreateCheckpoint
     * @apiGroup AOI
     * @apiPermission admin
     *
     * @apiDescription
     *     Create a new Checkpoint during an instance
     *     Note: this is an internal API that is called by the websocket GPU
     *
     * @apiSchema (Body) {jsonschema=./schema/checkpoint.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1432,
     *       "instance_id": 124,
     *       "storage": true,
     *       "created": "<date>"
     *   }
     */
    router.post(
        '/instance/:instanceid/checkpoint',
        requiresAuth,
        validate({ body: require('./schema/checkpoint.json') }),
        async (req, res) => {
            Param.int(req, res, 'instanceid');

            try {
                const inst = await instance.get(req.params.instanceid);
                if (req.auth.access !== 'admin' && req.auth.uid !== inst.uid) throw new Error(403, null, 'Cannot access resources you don\'t own');

                return res.json(await checkpoint.create(req.params.instanceid, req.body));
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
     * @apiPermission user
     *
     * @apiSchema (Body) {jsonschema=./schema/model.json} apiParam
     *
     * @apiDescription
     *     Create a new model in the system
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "id": 1,
     *       "created": "<date>"
     *   }
     */
    router.post(
        '/model',
        requiresAuth,
        validate({ body: require('./schema/model.json') }),
        async (req, res) => {
            try {
                res.json(await model.create(req.body, req.auth));
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
        Param.int(req, res, 'modelid');

        try {
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
     *       "model_finetunelayer": -2,
     *       "model_numparams": 563498,
     *       "model_inputshape": [100,100,4],
     *       "storage": true,
     *       "classes": [
     *           {"name": "Water", "color": "#0000FF"},
     *       ],
     *       "meta": {}
     *   }
     */
    router.get('/model/:modelid', requiresAuth, async (req, res) => {
        Param.int(req, res, 'modelid');

        try {
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
        Param.int(req, res, 'modelid');

        try {
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
     * @apiSchema (Query) {jsonschema=./schema/tile.query.json} apiParam
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

        Param.int(req, res, 'z');
        Param.int(req, res, 'x');
        Param.int(req, res, 'y');

        try {
            await proxy.request(req, res);
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
                err.validationErrors.body.map((e) => {
                    return {
                        message: e.message
                    };
                })
            );

            next();
        } else {
            next(err);
        }
    });

    const srv = app.listen(config.Port, (err) => {
        if (err) return err;

        if (cb) return cb(srv, pool);

        console.error(`ok - running ${config.BaseUrl}`);
    });

}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

module.exports = {
    server,
    configure,
    Config
};
