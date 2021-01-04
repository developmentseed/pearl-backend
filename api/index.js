#! /usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const jwt = require('express-jwt');
const morgan = require('morgan');
const minify = require('express-minify');
const bodyparser = require('body-parser');
const { body, validationResult } = require('express-validator');
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

const PORT = 2000;

if (require.main === module) {
    configure(argv);
}

function configure(argv, cb) {
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

    router.use(bodyparser.urlencoded({ extended: true }));
    router.use(morgan('combined'));
    router.use(bodyparser.json({
        limit: '50mb'
    }));

    router.post('/token', (req, res) => {

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
     * @apiDescription
     *     Create a new user
     */
    router.post('/user', async (req, res) => {
    });

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

    const srv = app.listen(PORT, (err) => {
        if (err) return err;

        if (cb) return cb(srv, pool);

        console.error(`ok - running http://localhost:${PORT}`);
    });

}
