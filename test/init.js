import { promisify } from 'node:util';
import request from 'request';
import Knex from 'knex';
import Config from '../services/api/lib/config.js';
import { Pool } from '@openaddresses/batch-generic';

import drop from '../services/api/test/drop.js';
import KnexConfig from '../services/api/knexfile.js';
import Token from '../services/api/lib/types/token.js';
import User from '../services/api/lib/types/user.js';

const prequest = promisify(request);

const state = {
    project: 1,
    token: false,
    instance: false,
    checkpoints: [],
    aois: [],
    timeframes: []
};

export function reconnect(test, API, argv) {
    running(test, API);

    test('pre-run', async (t) => {
        const config = await Config.env();
        config.pool = await Pool.connect(config.Postgres, {
            parsing: { geometry: true }
        });

        try {
            state.token = (await Token.generate(config.pool, {
                name: 'Default Token',
                type: 'auth0',
                uid: 1
            }, config.SigningSecret)).token;
        } catch (err) {
            t.error(err, 'no errors');
        }

        t.end();
    });

    test('Instance 1', async (t) => {
        try {
            const res = await prequest({
                method: 'GET',
                json: true,
                url: API + '/api/project/${argv.project}/instance/1',
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
                project_id: parseInt(argv.project),
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

export function connect(test, API, argv) {
    test('pre-run', async (t) => {
        try {
            await drop();

            const config = await Config.env();
            config.pool = await Pool.connect(config.Postgres, {
                parsing: { geometry: true }
            });

            KnexConfig.connection = config.Postgres;
            const knex = Knex(KnexConfig);
            await knex.migrate.latest();

            await User.generate(config.pool, {
                access: 'admin',
                username: 'example',
                email: 'example@example.com',
                auth0Id: 0,
                flags: {}
            });

            const user = await User.from(config.pool, 1);

            state.token = (await Token.generate(config.pool, {
                name: 'Default Token',
                type: 'auth0',
                uid: user.id
            }, config.SigningSecret)).token;

            await knex.destroy();
            await config.pool.end();
        } catch (err) {
            t.error(err, 'no errors');
        }

        t.end();
    });

    running(test, API);

    test('NAIP Model', async (t) => {
        try {
            const res = await prequest({
                method: 'POST',
                json: true,
                url: API + '/api/model',
                body: {
                    name: 'NAIP Supervised',
                    active: true,
                    model_type: 'pytorch_example',
                    imagery_source_id: 1,
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
                imagery_source_id: 1,
                storage: false,
                osmtag_id: null,
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

    test('NAIP Model - storage: true', async (t) => {
        try {
            const res = await prequest({
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
                imagery_source_id: 1,
                storage: true,
                osmtag_id: null,
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

    test('Sentinel Model', async (t) => {
        try {
            const res = await prequest({
                method: 'POST',
                json: true,
                url: API + '/api/model',
                body: {
                    name: 'Sentinel',
                    active: true,
                    model_type: 's2adeeplabv3plus',
                    imagery_source_id: 2,
                    model_inputshape: [512, 512, 4],
                    model_zoom: 13,
                    classes: [
                        {"name": "forest", "color": "#6CA966"},
                        {"name": "dry_jungle", "color": "#B5C590"},
                        {"name": "humid_jungle", "color": "#00A884"},
                        {"name": "pasture", "color": "#DBD746"},
                        {"name": "agriculture", "color": "#A96E2C"},
                        {"name": "urban", "color": "#F10100"},
                        {"name": "without_apparent_vegetation", "color": "#D0F3AB"},
                        {"name": "water", "color": "#486DA2"},
                        {"name": "scrub", "color": "#ABC964"},
                        {"name": "bare_soil", "color": "#B3AC9F"}
                    ],
                    meta: {},
                },
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.ok(parseInt(res.body.id), 'id: <integer>');

            delete res.body.created;
            delete res.body.id;

            t.deepEquals(res.body, {
                active: true,
                uid: 1,
                name: 'Sentinel',
                active: true,
                model_type: 's2adeeplabv3plus',
                imagery_source_id: 2,
                model_inputshape: [512, 512, 4],
                model_zoom: 13,
                storage: false,
                classes: [
                    {"name": "forest", "color": "#6CA966"},
                    {"name": "dry_jungle", "color": "#B5C590"},
                    {"name": "humid_jungle", "color": "#00A884"},
                    {"name": "pasture", "color": "#DBD746"},
                    {"name": "agriculture", "color": "#A96E2C"},
                    {"name": "urban", "color": "#F10100"},
                    {"name": "without_apparent_vegetation", "color": "#D0F3AB"},
                    {"name": "water", "color": "#486DA2"},
                    {"name": "scrub", "color": "#ABC964"},
                    {"name": "bare_soil", "color": "#B3AC9F"}
                ],
                meta: {},
                bounds: [ -180, -90, 180, 90 ],
                osmtag_id: null
            }, 'expected body');

        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    test('Sentinel Model - storage: true', async (t) => {
        try {
            const res = await prequest({
                method: 'PATCH',
                json: true,
                url: API + '/api/model/2',
                body: {
                    storage: true
                },
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.ok(parseInt(res.body.id), 'id: <integer>');

            delete res.body.created;
            delete res.body.id;

            t.deepEquals(res.body, {
                active: true,
                uid: 1,
                name: 'Sentinel',
                active: true,
                model_type: 's2adeeplabv3plus',
                imagery_source_id: 2,
                model_inputshape: [512, 512, 4],
                model_zoom: 13,
                storage: true,
                classes: [
                    {"name": "forest", "color": "#6CA966"},
                    {"name": "dry_jungle", "color": "#B5C590"},
                    {"name": "humid_jungle", "color": "#00A884"},
                    {"name": "pasture", "color": "#DBD746"},
                    {"name": "agriculture", "color": "#A96E2C"},
                    {"name": "urban", "color": "#F10100"},
                    {"name": "without_apparent_vegetation", "color": "#D0F3AB"},
                    {"name": "water", "color": "#486DA2"},
                    {"name": "scrub", "color": "#ABC964"},
                    {"name": "bare_soil", "color": "#B3AC9F"}
                ],
                meta: {},
                bounds: [ -180, -90, 180, 90 ],
                osmtag_id: null
            }, 'expected body');

        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    test('Project 1 - NAIP', async (t) => {
        try {
            const res = await prequest({
                method: 'POST',
                json: true,
                url: API + '/api/project',
                body: {
                    name: 'Test Project',
                    model_id: 1
                },
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(res.body).sort(), [
                'created', 'id', 'model_id', 'name', 'uid', 'model_name'
            ].sort(), 'expected props');

            t.ok(res.body.created, 'created: <date>');

            delete res.body.created;

            t.deepEquals(res.body, {
                id: 1,
                uid: 1,
                name: 'Test Project',
                model_id: 1,
                model_name: 'NAIP Supervised'
            }, 'expected body');
        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    test('AOI 1 - Seneca Rocks (small)', async (t) => {
        try {
            const res = await prequest({
                method: 'POST',
                json: true,
                url: API + '/api/project/1/aoi',
                body: {
                    name: 'Seneca Rocks, WV',
                    bounds: {
                        type: 'Polygon',
                        coordinates: [[
                            [ -79.38355922698973, 38.830046580030306 ],
                            [ -79.37222957611084, 38.830046580030306 ],
                            [ -79.37222957611084, 38.83666569946354 ],
                            [ -79.38355922698973, 38.83666569946354 ],
                            [ -79.38355922698973, 38.830046580030306 ]
                        ]]
                    }
                },
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(res.body).sort(), [
                'area', 'bookmarked', 'bookmarked_at', 'bounds', 'created', 'id', 'name', 'project_id', 'updated'
            ].sort(), 'expected props');

            t.ok(res.body.created, 'created: <date>');
            delete res.body.created;

            t.ok(res.body.updated, 'updated: <date>');
            delete res.body.updated;

            t.deepEquals(res.body, {
                id: 1,
                name: 'Seneca Rocks, WV',
                project_id: 1,
                bookmarked: false,
                bookmarked_at: null,
                area: 722859,
                bounds: {
                    type: 'Polygon',
                    bounds: [ -79.38355922698973, 38.830046580030306, -79.37222957611084, 38.83666569946354 ],
                    coordinates: [[
                        [ -79.38355922698973, 38.830046580030306 ],
                        [ -79.37222957611084, 38.830046580030306 ],
                        [ -79.37222957611084, 38.83666569946354 ],
                        [ -79.38355922698973, 38.83666569946354 ],
                        [ -79.38355922698973, 38.830046580030306 ]
                    ]]
                }
            }, 'expected body');
        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    test('AOI 2 - Riverton (large)', async (t) => {
        try {
            const res = await prequest({
                method: 'POST',
                json: true,
                url: API + '/api/project/1/aoi',
                body: {
                    name: 'Riverton, WV',
                    bounds: {
                        type: 'Polygon',
                        coordinates: [[
                            [-79.4466018676758,38.72850983470067],
                            [-79.40935134887695,38.72850983470067],
                            [-79.40935134887695,38.756225137839074],
                            [-79.4466018676758,38.756225137839074],
                            [-79.4466018676758,38.72850983470067]
                        ]]
                    }

                },
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(res.body).sort(), [
                'area', 'bookmarked', 'bookmarked_at', 'bounds', 'created', 'id', 'name', 'project_id', 'updated'
            ].sort(), 'expected props');

            t.ok(res.body.created, 'created: <date>');
            delete res.body.created;

            t.ok(res.body.updated, 'updated: <date>');
            delete res.body.updated;

            t.deepEquals(res.body, {
                id: 2,
                project_id: 1,
                bookmarked: false,
                bookmarked_at: null,
                area: 9964013,
                name: 'Riverton, WV',
                bounds: {
                    type: 'Polygon',
                    bounds: [ -79.4466018676758, 38.72850983470067, -79.40935134887695, 38.756225137839074 ],
                    coordinates: [[
                        [-79.4466018676758,38.72850983470067],
                        [-79.40935134887695,38.72850983470067],
                        [-79.40935134887695,38.756225137839074],
                        [-79.4466018676758,38.756225137839074],
                        [-79.4466018676758,38.72850983470067]
                    ]]
                }

            }, 'expected body');
        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    test('Project 2 - Sentinel', async (t) => {
        try {
            const res = await prequest({
                method: 'POST',
                json: true,
                url: API + '/api/project',
                body: {
                    name: 'Sentinel Project',
                    model_id: 2
                },
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(res.body).sort(), [
                'created', 'id', 'model_id', 'name', 'uid', 'model_name'
            ].sort(), 'expected props');

            t.ok(res.body.created, 'created: <date>');

            delete res.body.created;

            t.deepEquals(res.body, {
                id: 2,
                uid: 1,
                name: 'Sentinel Project',
                model_id: 2,
                model_name: 'Sentinel'
            }, 'expected body');
        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    test('AOI 3 - Seneca Rocks (small)', async (t) => {
        try {
            const res = await prequest({
                method: 'POST',
                json: true,
                url: API + '/api/project/2/aoi',
                body: {
                    name: 'Seneca Rocks, WV',
                    bounds: {
                        type: 'Polygon',
                        coordinates: [[
                            [ -79.38355922698973, 38.830046580030306 ],
                            [ -79.37222957611084, 38.830046580030306 ],
                            [ -79.37222957611084, 38.83666569946354 ],
                            [ -79.38355922698973, 38.83666569946354 ],
                            [ -79.38355922698973, 38.830046580030306 ]
                        ]]
                    }
                },
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(res.body).sort(), [
                'area', 'bookmarked', 'bookmarked_at', 'bounds', 'created', 'id', 'name', 'project_id', 'updated'
            ].sort(), 'expected props');

            t.ok(res.body.created, 'created: <date>');
            delete res.body.created;

            t.ok(res.body.updated, 'updated: <date>');
            delete res.body.updated;

            t.deepEquals(res.body, {
                id: 3,
                name: 'Seneca Rocks, WV',
                project_id: 2,
                bookmarked: false,
                bookmarked_at: null,
                area: 722859,
                bounds: {
                    type: 'Polygon',
                    bounds: [ -79.38355922698973, 38.830046580030306, -79.37222957611084, 38.83666569946354 ],
                    coordinates: [[
                        [ -79.38355922698973, 38.830046580030306 ],
                        [ -79.37222957611084, 38.830046580030306 ],
                        [ -79.37222957611084, 38.83666569946354 ],
                        [ -79.38355922698973, 38.83666569946354 ],
                        [ -79.38355922698973, 38.830046580030306 ]
                    ]]
                }
            }, 'expected body');
        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });

    test('Instance 1', async (t) => {
        try {
            const res = await prequest({
                method: 'POST',
                json: true,
                url: API + `/api/project/${parseInt(argv.project)}/instance`,
                body: {},
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            });

            t.equals(res.statusCode, 200, '200 status code');

            t.deepEquals(Object.keys(res.body).sort(), [
                'active',
                'timeframe_id',
                'checkpoint_id',
                'created',
                'id',
                'batch',
                'last_update',
                'pod',
                'project_id',
                'token',
                'type'
            ].sort(), 'expected props');

            t.ok(parseInt(res.body.id), 'id: <integer>');

            state.instance = JSON.parse(JSON.stringify(res.body));

            delete res.body.id;
            delete res.body.created;
            delete res.body.last_update;
            delete res.body.token;

            t.deepEquals(res.body, {
                project_id: parseInt(argv.project),
                batch: null,
                timeframe_id: null,
                checkpoint_id: null,
                active: false,
                pod: {},
                type: 'cpu'
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
            const res = await prequest({
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
            const res = await prequest({
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
            const res = await prequest({
                method: 'GET',
                json: true,
                url: `${API}/api`
            });

            t.equals(res.statusCode, 200);

            t.deepEquals(res.body, {
                version: '1.0.0',
                qa_tiles: 'https://qa-tiles-server-dev.ds.io/services/z17',
                limits: {
                    live_inference: 100000000,
                    max_inference: 200000000,
                    instance_window: 600,
                    total_gpus: 2,
                    active_gpus: 0,
                    total_cpus: 10,
                    active_cpus: 0
                }
            });

        } catch (err) {
            t.error(err, 'no error');
        }

        t.end();
    });
}
