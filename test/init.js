'use strict';

const { promisify } = require('util');
const request = promisify(require('request'));
const Knex = require('knex');

const { drop, genconfig } = require('../services/api/test/drop');
const KnexConfig = require('../services/api/knexfile');

let state = {
    project: 1,
    token: false,
    instance: false,
    checkpoints: [],
    aois: []
};

function reconnect(test, API) {
    running(test, API);

    test('pre-run', async (t) => {
        const config = await genconfig();
        try {
            const authtoken = new (require('../services/api/lib/auth').AuthToken)(config);
            state.token = (await authtoken.generate({
                type: 'auth0',
                uid: 1
            }, 'API Token')).token;
        } catch (err) {
            t.error(err, 'no errors');
        }

        t.end();
    });

    test('Instance 1', async (t) => {
        try {
            const res = await request({
                method: 'GET',
                json: true,
                url: API + '/api/project/1/instance/1',
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(res.body).sort(), [
                'active', 'aoi_id', 'checkpoint_id', 'created', 'id', 'last_update', 'project_id', 'token'
            ].sort(), 'expected props');

            t.ok(parseInt(res.body.id), 'id: <integer>');

            state.instance = JSON.parse(JSON.stringify(res.body));

            delete res.body.id;
            delete res.body.created;
            delete res.body.last_update;
            delete res.body.token;
            delete res.body.active;

            t.deepEquals(res.body, {
                is_batch: false,
                project_id: 1,
                aoi_id: null,
                checkpoint_id: null
            }, 'expected body');

        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    populate(test, API, state);

    return state;
}

function connect(test, API) {
    test('pre-run', async (t) => {
        try {
            const config = await drop();

            KnexConfig.connection = config.Postgres;
            const knex = Knex(KnexConfig);
            await knex.migrate.latest();

            const auth = new (require('../services/api/lib/auth').Auth)(config);
            const authtoken = new (require('../services/api/lib/auth').AuthToken)(config);

            await auth.create({
                access: 'admin',
                username: 'example',
                email: 'example@example.com',
                auth0Id: 0
            });

            state.token = (await authtoken.generate({
                type: 'auth0',
                uid: 1
            }, 'API Token')).token;

            await knex.destroy();
            config.pool.end();
        } catch (err) {
            t.error(err, 'no errors');
        }

        t.end();
    });

    running(test, API);

    test('new model', async (t) => {
        try {
            const res = await request({
                method: 'POST',
                json: true,
                url: API + '/api/model',
                body: {
                    name: 'NAIP Supervised',
                    active: true,
                    model_type: 'pytorch_example',
                    model_inputshape: [256, 256, 4],
                    model_zoom: 17,
                    classes: [
                        { name: 'Water', color: '#0000FF' },
                        { name: 'Emergent Wetlands', color: '#008000' },
                        { name: 'Tree Canopy', color: '#80FF80' },
                        { name: 'Shrubland', color: '#806060' },
                        { name: 'Low Vegetation', color: '#07c4c5' },
                        { name: 'Barren', color: '#027fdc' },
                        { name: 'Structure', color: '#f76f73' },
                        { name: 'Impervious Surface', color: '#ffb703' },
                        { name: 'Impervious Road', color: '#0218a2' }
                    ],
                    meta: {}
                },
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(res.body).sort(), [
                'id', 'bounds', 'created', 'active', 'uid', 'name', 'model_type', 'model_inputshape', 'model_zoom', 'storage', 'classes', 'meta'
            ].sort(), 'expected props');

            t.ok(parseInt(res.body.id), 'id: <integer>');

            delete res.body.created;
            delete res.body.id;

            t.deepEquals(res.body, {
                active: true,
                uid: 1,
                name: 'NAIP Supervised',
                bounds: [-180, -90, 180, 90],
                model_type: 'pytorch_example',
                model_inputshape: [256, 256, 4],
                model_zoom: 17,
                storage: null,
                classes: [
                    { name: 'Water', color: '#0000FF' },
                    { name: 'Emergent Wetlands', color: '#008000' },
                    { name: 'Tree Canopy', color: '#80FF80' },
                    { name: 'Shrubland', color: '#806060' },
                    { name: 'Low Vegetation', color: '#07c4c5' },
                    { name: 'Barren', color: '#027fdc' },
                    { name: 'Structure', color: '#f76f73' },
                    { name: 'Impervious Surface', color: '#ffb703' },
                    { name: 'Impervious Road', color: '#0218a2' }
                ],
                meta: {}
            }, 'expected body');

        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    test('new model - storage: true', async (t) => {
        try {
            const res = await request({
                method: 'PATCH',
                json: true,
                url: API + '/api/model/1',
                body: {
                    storage: true
                },
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(res.body).sort(), [
                'id', 'bounds', 'created', 'active', 'uid', 'name', 'model_type', 'model_inputshape', 'model_zoom', 'storage', 'classes', 'meta'
            ].sort(), 'expected props');

            t.ok(parseInt(res.body.id), 'id: <integer>');

            delete res.body.created;
            delete res.body.id;

            t.deepEquals(res.body, {
                active: true,
                uid: 1,
                name: 'NAIP Supervised',
                bounds: [-180, -90, 180, 90],
                model_type: 'pytorch_example',
                model_inputshape: [256, 256, 4],
                model_zoom: 17,
                storage: true,
                classes: [
                    { name: 'Water', color: '#0000FF' },
                    { name: 'Emergent Wetlands', color: '#008000' },
                    { name: 'Tree Canopy', color: '#80FF80' },
                    { name: 'Shrubland', color: '#806060' },
                    { name: 'Low Vegetation', color: '#07c4c5' },
                    { name: 'Barren', color: '#027fdc' },
                    { name: 'Structure', color: '#f76f73' },
                    { name: 'Impervious Surface', color: '#ffb703' },
                    { name: 'Impervious Road', color: '#0218a2' }
                ],
                meta: {}
            }, 'expected body');

        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    test('Project 1', async (t) => {
        try {
            const res = await request({
                method: 'POST',
                json: true,
                url: API + '/api/project',
                body: {
                    name: 'Test Project',
                    model_id: 1,
                    mosaic: 'naip.latest'
                },
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(res.body).sort(), [
                'created', 'id', 'model_id', 'mosaic', 'name', 'uid'
            ], 'expected props');

            t.ok(res.body.created, 'created: <date>');

            delete res.body.created;

            t.deepEquals(res.body, {
                id: 1,
                uid: 1,
                name: 'Test Project',
                model_id: 1,
                mosaic: 'naip.latest'
            }, 'expected body');
        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    test('Instance 1', async (t) => {
        try {
            const res = await request({
                method: 'POST',
                json: true,
                url: API + '/api/project/1/instance',
                body: {},
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(res.body).sort(), [
                'active',
                'aoi_id',
                'checkpoint_id',
                'created',
                'id',
                'is_draft',
                'last_update',
                'pod',
                'project_id',
                'token',
                'type',
            ].sort(), 'expected props');

            t.ok(parseInt(res.body.id), 'id: <integer>');

            state.instance = JSON.parse(JSON.stringify(res.body));

            delete res.body.id;
            delete res.body.created;
            delete res.body.last_update;
            delete res.body.token;

            t.deepEquals(res.body, {
                project_id: 1,
                is_draft: false,
                aoi_id: null,
                checkpoint_id: null,
                active: false,
                pod: {},
                type: 'gpu'
            }, 'expected body');

        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    populate(test, API, state);

    return state;
}

function populate(test, API, state) {
    test('Checkpoints', async (t) => {
        try {
            const res = await request({
                method: 'GET',
                json: true,
                url: API + `/api/project/${state.project}/checkpoint`,
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200);

            state.checkpoints = res.body.checkpoints;
        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    test('AOIs', async (t) => {
        try {
            const res = await request({
                method: 'GET',
                json: true,
                url: API + `/api/project/${state.project}/aoi`,
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200);

            state.aois = res.body.aois;
        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });
}

function running(test, API) {
    test('api running', async (t) => {
        try {
            const res = await request({
                method: 'GET',
                json: true,
                url: API + '/api'
            });

            t.equals(res.statusCode, 200);

            t.deepEquals(res.body, {
                version: '1.0.0',
                limits: {
                    live_inference: 100000000,
                    max_inference: 100000000,
                    instance_window: 600,
                    total_gpus: 2,
                    active_gpus: null
                }
            });

        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });
}

module.exports = {
    connect,
    reconnect
};
