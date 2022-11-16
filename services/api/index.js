#! /usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import express from 'express';
import jwt from 'express-jwt';
import jwks from 'jwks-rsa';
import cors from 'cors';
import minify from 'express-minify';
import { ValidationError } from 'express-json-validator-middleware';
import minimist from 'minimist';
import { Pool } from '@openaddresses/batch-generic';

import { fetchJSON } from './lib/util.js';
import Kube from './lib/kube.js';
import User from './lib/types/user.js';
import Token from './lib/types/token.js';
import Config from './lib/config.js';
import Err from '@openaddresses/batch-error';
import Schema from '@openaddresses/batch-schema';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)));

const argv = minimist(process.argv, {
    boolean: ['prod', 'silent', 'test'],
    string: ['port']
});

if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        const config = await Config.env(argv);
        server(config);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
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

export default async function server(config) {
    const app = express();

    config.pool = await Pool.connect(config.Postgres, {
        schemas: {
            dir: new URL('./schema/', import.meta.url)
        },
        parsing: {
            geometry: true
        }
    });

    const schema = new Schema(express.Router(), {
        schemas: path.resolve(__dirname, 'schema')
    });

    await schema.api();

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
        let active_gpus = 0;
        let active_cpus = 0;
        if (config.Environment !== 'local') {
            const kube = new Kube(config, 'default');
            podList = await kube.listPods();
            if (podList.length) {
                active_gpus = podList.filter((p) => {
                    return (p.status.phase === 'Running' && p.metadata.labels.type === 'gpu');
                }).length;
                active_cpus = podList.filter((p) => {
                    return (p.status.phase === 'Running' && p.metadata.labels.type === 'cpu');
                }).length;
            }
        }

        return res.json({
            version: pkg.version,
            qa_tiles: config.QA_Tiles,
            limits: {
                live_inference: 100000000,
                max_inference: 200000000,
                instance_window: 600,
                total_gpus: config.GpuCount,
                total_cpus: config.CpuCount,
                active_gpus: active_gpus,
                active_cpus: active_cpus
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
            req.auth = await Token.validate(config, req.jwt.token);
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
            } else if (err) {
                return Err.respond(new Err(500, null, 'Generic Internal Error'), res);
            } else {
                next();
            }
        },
        async (req, res, next) => {
            if (req.jwt.type === 'auth0') {
                try {
                    // Load user from database, if exists
                    const user = await User.from(config.pool, req.user.sub, 'auth0_id');
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
                    req.auth = await User.generate(config.pool, {
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


    await schema.api();
    await schema.load(
        new URL('./routes/', import.meta.url),
        config,
        {
            silent: !!config.silent
        }
    );

    schema.not_found();
    schema.error();

    fs.writeFileSync(new URL('./doc/api.js', import.meta.url), schema.docs.join('\n'));

    return new Promise((resolve, reject) => {
        const srv = app.listen(config.Port, (err) => {
            if (err) return reject(err);

            if (!config.silent) console.log(`ok - http://localhost:${config.Port}`);
            return resolve([srv, config]);
        });
    });

}
