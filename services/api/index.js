#! /usr/bin/env node

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const { fetchJSON } = require('./lib/util');
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const cors = require('cors');
const morgan = require('morgan');
const minify = require('express-minify');
const bodyparser = require('body-parser');
const { ValidationError } = require('express-json-validator-middleware');
const pkg = require('./package.json');
const Kube = require('./lib/kube');

const { Schema, Err } = require('@openaddresses/batch-schema');

const argv = require('minimist')(process.argv, {
    boolean: ['prod', 'silent', 'test'],
    string: ['port']
});

const Config = require('./lib/config');

if (require.main === module) {
    configure(argv);
}

function configure(args = {}, cb) {
    Config.env(args).then((config) => {
        return server(args, config, cb);
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
 * @param {Object} args - Command Line Args
 * @param {Config} config
 * @param {function} cb
 */
async function server(args, config, cb) {
    const app = express();

    const schema = new Schema(express.Router(), {
        schema: path.resolve(__dirname, 'schema')
    });
    await schema.api();

    const auth = new (require('./lib/auth').Auth)(config);
    const authtoken = new (require('./lib/auth').AuthToken)(config);

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
     *           "max_inference": 200000000 (m^2)
     *           "instance_window": 600 (m secs)
     *       }
     *   }
     */
    app.get('/api', async (req, res) => {
        let podList = [];
        if (config.Environment !== 'local') {
            const kube = new Kube(config, 'default');
            podList = await kube.listPods();
        }

        return res.json({
            version: pkg.version,
            qa_tiles: config.QA_Tiles,
            limits: {
                live_inference: 100000000,
                max_inference: 200000000,
                instance_window: 600,
                total_gpus: config.GpuCount,
                active_gpus: podList.filter((p) => p.status.phase === 'Running').length
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

    app.use('/api', schema.router);

    schema.router.use(morgan('combined'));
    schema.router.use(bodyparser.text());
    schema.router.use(bodyparser.urlencoded({ extended: true }));
    schema.router.use(bodyparser.json({ limit: '50mb' }));

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
    config.requiresAuth = [
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

    // Load dynamic routes directory
    for (const r of fs.readdirSync(path.resolve(__dirname, './routes'))) {
        if (!config.silent) console.error(`ok - loaded routes/${r}`);
        await require('./routes/' + r)(schema, config);
    }

    schema.router.all('*', (req, res) => {
        return res.status(404).json({
            status: 404,
            message: 'API endpoint does not exist!'
        });
    });

    schema.error();

    const srv = app.listen(config.Port, (err) => {
        if (err) return err;

        if (!config.silent) console.log(`ok - ${config.BaseUrl}`);
        if (cb) return cb(srv, config);
    });

}

module.exports = configure;
