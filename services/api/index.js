#! /usr/bin/env node

'use strict';

const fs = require('fs');
const Err = require('./lib/error');
const path = require('path');
const express = require('express');
const { Param } = require('./lib/util');
const session = require('express-session');
const morgan = require('morgan');
const minify = require('express-minify');
const bodyparser = require('body-parser');
const { Validator, ValidationError } = require('express-json-validator-middleware');
const pkg = require('./package.json');

const argv = require('minimist')(process.argv, {
    boolean: ['prod'],
    string: ['postgres', 'port']
});

const pgSession = require('connect-pg-simple')(session);
const router = express.Router();
const app = express();
const { Pool } = require('pg');
const Config = require('./lib/config');

const validator = new Validator({
    allErrors: true
});

const validate = validator.validate;

if (require.main === module) {
    configure(argv);
}

function configure(argv = {}, cb) {
    Config.env(argv).then((config) => {
        return server(argv, config, cb);
    }).catch((err) => {
        console.error(err);
        process.exit(1);
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
 * @param {Object} argv
 * @param {Config} config
 * @param {function} cb
 */
async function server(argv, config, cb) {
    const pool = new Pool({
        connectionString: config.Postgres
    });

    try {
        await pool.query(String(fs.readFileSync(path.resolve(__dirname, 'schema.sql'))));
    } catch (err) {
        throw new Error(err);
    }

    const proxy = new (require('./lib/proxy').Proxy)(config);
    const auth = new (require('./lib/auth').Auth)(pool);
    const authtoken = new (require('./lib/auth').AuthToken)(pool, config);
    const model = new (require('./lib/model').Model)(pool);
    const instance = new (require('./lib/instance').Instance)(pool, config);

    app.disable('x-powered-by');
    app.use(minify());
    app.use(session({
        name: argv.prod ? '__Host-session' : 'session',
        proxy: argv.prod,
        resave: false,
        store: new pgSession({
            pool: pool,
            tableName : 'session'
        }),
        cookie: {
            maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
            sameSite: true,
            secure: argv.prod
        },
        saveUninitialized: true,
        secret: config.SigningSecret
    }));

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
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "version": "1.0.0"
     *   }
     */
    app.get('/api', (req, res) => {
        return res.json({
            version: pkg.version
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

    // Unified Auth
    router.use(async (req, res, next) => {
        if (req.session && req.session.auth && req.session.auth.username) {
            req.auth = req.session.auth;
            req.auth.type = 'session';
        } else if (req.header('authorization')) {
            const authorization = req.header('authorization').split(' ');
            if (authorization[0].toLowerCase() !== 'bearer') {
                return res.status(401).json({
                    status: 401,
                    message: 'Only "Bearer" authorization header is allowed'
                });
            }

            try {
                req.auth = await authtoken.validate(authorization[1]);
                req.auth.type = 'token';
            } catch (err) {
                return Err.respond(err, res);
            }
        } else {
            req.auth = false;
        }

        return next();
    });

    /**
     * @api {get} /api/login Session Info
     * @apiVersion 1.0.0
     * @apiName get
     * @apiGroup Login
     * @apiPermission user
     *
     * @apiDescription
     *     Return information about the currently logged in user
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
    router.get('/login', async (req, res) => {
        if (req.session && req.session.auth && req.session.auth.username) {
            return res.json({
                username: req.session.auth.username,
                email: req.session.auth.email,
                access: req.session.auth.access,
                flags: req.session.auth.flags
            });
        } else {
            return res.status(401).json({
                status: 401,
                message: 'Invalid session'
            });
        }
    });

    /**
     * @api {post} /api/login Create Session
     * @apiVersion 1.0.0
     * @apiName login
     * @apiGroup Login
     * @apiPermission user
     *
     * @apiDescription
     *     Log a user into the service and create an authenticated cookie
     *
     * @apiSchema (Body) {jsonschema=./schema/login.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "username": "example"
     *   }
     */
    router.post(
        '/login',
        validate({ body: require('./schema/login.json') }),
        async (req, res) => {
            try {
                const user = await auth.login({
                    username: req.body.username,
                    password: req.body.password
                });

                req.session.auth = user;

                return res.json({
                    username: user.username
                });
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
    router.get('/token', async (req, res) => {
        try {
            await auth.is_auth(req);

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
     * @apiSchema (Body) {jsonschema=./schema/login.json} apiParam
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
        validate({ body: require('./schema/token.json') }),
        async (req, res) => {
            try {
                await auth.is_auth(req);

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
    router.delete('/token/:tokenid', async (req, res) => {
        Param.int(req, res, 'tokenid');

        try {
            await auth.is_auth(req);

            return res.json(await authtoken.delete(req.auth, req.params.tokenid));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/user List Users
     * @apiVersion 1.0.0
     * @apiName list
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
        validate({ query: require('./schema/user-list.query.json') }),
        async (req, res) => {
            try {
                await auth.is_admin(req);

                const users = await auth.list(req.query);

                return res.json(users);
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {post} /api/user Create User
     * @apiVersion 1.0.0
     * @apiName Create
     * @apiGroup User
     * @apiPermission public
     *
     * @apiSchema (Body) {jsonschema=./schema/user.json} apiParam
     *
     * @apiDescription
     *     Create a new user
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "status": 200,
     *       "message": "User Created"
     *   }
     */
    router.post(
        '/user',
        validate({ body: require('./schema/user.json') }),
        async (req, res) => {
            try {
                await auth.register(req.body);

                return res.json({
                    status: 200,
                    message: 'User Created'
                });
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
    router.get('/user/me', async (req, res) => {
        if (req.session && req.session.auth && req.session.auth.uid) {
            return res.json(await auth.user(req.session.auth.uid));
        } else {
            return res.status(401).json({
                status: 401,
                message: 'Invalid session'
            });
        }
    });

    /**
     * @api {get} /api/instance Create Instance
     * @apiVersion 1.0.0
     * @apiName create
     * @apiGroup Instance
     * @apiPermission user
     *
     * @apiDescription
     *     Instruct the GPU pool to start a new model instance and return a time limited session
     *     token for accessing the websockets GPU API
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "url": "ws://<websocket-connection-url>",
     *       "token": "websocket auth token"
     *   }
     */
    router.post('/instance',
        validate({ body: require('./schema/instance.json') }),
        async (req, res) => {
            try {
                await auth.is_auth(req);

                res.json(await instance.create(req.auth, req.body.model_id));
            } catch (err) {
                return Err.respond(err, res);
            }
        }
    );

    /**
     * @api {delete} /api/instance/:instance Delete Instance
     * @apiVersion 1.0.0
     * @apiName CreateInstance
     * @apiGroup Instance
     * @apiPermission user
     */
    router.delete('/instance/:instanceid', async (req, res) =>{
    });

    /**
     * @api {get} /api/instance/:instance Get Instance
     * @apiVersion 1.0.0
     * @apiName GetInstance
     * @apiGroup Instance
     * @apiPermission user
     */
    router.get('/instance/:instanceid', async (req, res) => {
    });

    /**
     * @api {post} /api/model Create Model
     * @apiVersion 1.0.0
     * @apiName CreateModel
     * @apiGroup Model
     * @apiPermission user
     */
    router.post(
        '/model',
        validate({ body: require('./schema/model.json') }),
        async (req, res) => {
            try {
                await auth.is_auth(req);

                res.json(await model.create(req.body));
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
     */
    router.get(
        '/model',
        async (req, res) => {
            try {
                await auth.is_auth(req);

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
    router.delete('/model/:modelid', async (req, res) => {
        try {
            await auth.is_auth(req);

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
     */
    router.get('/model/:modelid', async (req, res) => {
        try {
            await auth.is_auth(req);

            res.json(await model.get(req.body));
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
    router.get('/mosaic', async (req, res) => {
        try {
            await auth.is_auth(req);

            return res.json({
                mosaics: [
                    'naip.latest'
                ]
            });
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
    router.get('/mosaic/:layer', async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            await auth.is_auth(req);

            req.url = req.url + '/tilejson.json'

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
     * @apiDescription
     *     Return an aerial imagery tile for a given set of mercator coordinates
     *
     */
    router.get('/mosaic/:layer/tiles/:z/:x/:y.:format', async (req, res) => {
        if (!config.TileUrl) return Err.respond(new Err(404, null, 'Tile Endpoint Not Configured'), res);

        try {
            await auth.is_auth(req);

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
            console.error(err.validationErrors.body);

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

        console.error(`ok - running http://localhost:${config.Port}`);
    });

}

module.exports = {
    server,
    configure,
    Config
}
