#! /usr/bin/env node

'use strict';

const fs = require('fs');
const Err = require('./lib/error');
const path = require('path');
const express = require('express');
const session = require('express-session');
const jwt = require('express-jwt');
const morgan = require('morgan');
const minify = require('express-minify');
const bodyparser = require('body-parser');
const { Validator, ValidationError } = require('express-json-validator-middleware');
const pkg = require('./package.json');

const argv = require('minimist')(process.argv, {
    boolean: ['prod'],
    string: ['postgres']
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

const PORT = 2000;

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

    const auth = new (require('./lib/auth').Auth)(pool);
    const authtoken = new (require('./lib/auth').AuthToken)(pool);

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
        secret: config.CookieSecret
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
     */
    router.get('/token', async (req, res) => {
        return res.send('HERE');
    });

    /**
     * @api {post} /api/token Create Token
     * @apiVersion 1.0.0
     * @apiName CreateToken
     * @apiGroup Token
     * @apiPermission user
     */
    router.post('/token', async (req, res) => {
    });

    /**
     * @api {delete} /api/token/:id Delete Token
     * @apiVersion 1.0.0
     * @apiName DeleteToken
     * @apiGroup Token
     * @apiPermission user
     */
    router.delete('/token/:id', async (req, res) => {
    });

    /**
     * @api {get} /api/user List Users
     * @apiVersion 1.0.0
     * @apiName list
     * @apiGroup User
     * @apiPermission admin
     *
     * @apiParam {Number} [limit=100] Limit number of returned runs
     * @apiParamExample {String} ?limit
     *     ?limit=12
     *
     * @apiParam {Number} [page=0] The offset based on limit to return
     * @apiParamExample {String} ?page
     *     ?page=0
     *
     * @apiParam {String} [filter=] Filter a complete or partial username/email
     * @apiParamExample {String} ?filter
     *     ?filter=person@example.com
     *
     * @apiDescription
     *     Return a list of users that have registered with the service
     */
    router.get('/user', async (req, res) => {
    });

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
     */
    router.post(
        '/user',
        validate({ body: require('./schema/user.json') }),
        async (req, res) => {
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

    const srv = app.listen(PORT, (err) => {
        if (err) return err;

        if (cb) return cb(srv, pool);

        console.error(`ok - running http://localhost:${PORT}`);
    });

}

module.exports = {
    server,
    configure,
    Config
}
