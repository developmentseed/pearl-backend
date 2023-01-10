import Err from '@openaddresses/batch-error';
import Project from '../lib/types/project.js';
import AOI from '../lib/types/aoi.js';
import { sql } from 'slonik';

export default async function router(schema, config) {
    await schema.get('/project/:projectid/aoi/:aoiid', {
        name: 'Get AOI',
        group: 'AOI',
        auth: 'user',
        description: 'Return all information about a given AOI',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        res: 'res.AOI.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            return res.json(await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/aoi', {
        name: 'List AOIs',
        group: 'AOI',
        auth: 'user',
        description: 'Return all AOIs for a given instance',
        ':projectid': 'integer',
        query: 'req.query.aoi.json',
        res: 'res.ListAOIs.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            return res.json(await AOI.list(config.pool, req.params.projectid, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/project/:projectid/aoi', {
        name: 'Create AOI',
        group: 'AOI',
        auth: 'admin',
        description: `
            Create a new AOI during an instance
            Note: this is an internal API that is called by the websocket GPU
        `,
        ':projectid': 'integer',
        body: 'req.body.CreateAOI.json',
        res: 'res.AOI.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            return res.json(await AOI.from(config.pool, (await AOI.generate(config.pool, {
                project_id: req.params.projectid,
                ...req.body
            })).id));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/project/:projectid/aoi/:aoiid', {
        name: 'Patch AOI',
        group: 'AOI',
        auth: 'user',
        description: 'Update an AOI',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        body: 'req.body.PatchAOI.json',
        res: 'res.AOI.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            return res.json(await a.commit({
                updated: sql`Now()`,
                ...req.body
            }));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/project/:projectid/aoi/:aoiid', {
        name: 'Patch AOI',
        group: 'AOI',
        auth: 'user',
        description: 'Update an AOI',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        body: 'req.body.PatchAOI.json',
        res: 'res.AOI.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            return res.json(await a.commit({
                updated: sql`Now()`,
                ...req.body
            }));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/project/:projectid/aoi/:aoiid', {
        name: 'Delete AOI',
        group: 'AOI',
        auth: 'user',
        description: 'Delete an existing AOI',
        ':projectid': 'integer',
        ':aoiid': 'integer',
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const a = await AOI.has_auth(config.pool, req.auth, req.params.projectid, req.params.aoiid);

            await a.commit({
                archived: true
            });

            return res.json({
                status: 200,
                message: 'AOI Deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });


}
