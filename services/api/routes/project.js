import Err from '@openaddresses/batch-error';
import Mosaic from '../lib/mosaic.js';
import Project from '../lib/types/project.js';
import AOI from '../lib/types/aoi.js';
import Model from '../lib/types/model.js';
import Instance from '../lib/types/instance.js';
import Checkpoint from '../lib/types/checkpoint.js';

export default async function router(schema, config) {
    await schema.get('/project', {
        name: 'List Projects',
        group: 'Projects',
        auth: 'user',
        description: 'Return a list of all projects',
        query: 'req.query.ListProjects.json',
        res: 'res.ListProjects.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const results = await Project.list(config.pool, req.auth.id, req.query);
            if (results.projects && results.projects.length) {
                for (let index = 0; index < results.projects.length; index++) {
                    const p = results.projects[index];
                    const aois = await AOI.list(config.pool, p.id, { bookmarked: true });
                    const checkpoints = await Checkpoint.list(config.pool, p.id, { bookmarked: true });
                    // remove reduntant project id
                    delete aois.project_id;
                    delete checkpoints.project_id;
                    p['aois'] = aois.aois;
                    p['checkpoints'] = checkpoints.checkpoints;
                    p['model'] = {};
                    if (p.model_id) {
                        p['model'] = (await Model.from(config.pool, p.model_id)).serialize();
                        delete p.model_id;
                    }
                }
            }

            res.json(results);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid', {
        name: 'Get Project',
        group: 'Projects',
        auth: 'user',
        description: 'Return all information about a given project',
        ':projectid': 'integer',
        res: 'res.Project.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const proj = await Project.has_auth(config.pool, req.auth, req.params.projectid);

            const json = proj.serialize();

            const checkpoints = await Checkpoint.list(config.pool, req.params.projectid, { bookmarked: true });
            // remove redundant project id
            delete checkpoints.project_id;
            json.checkpoints = checkpoints.checkpoints;
            const model = await Model.from(config.pool, json.model_id);
            json.model_name = model.name;

            return res.json(json);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/project', {
        name: 'Create Project',
        group: 'Projects',
        auth: 'user',
        description: 'Create a new project',
        body: 'req.body.CreateProject.json',
        res: 'res.Project.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            if (!req.body.mosaic || !Mosaic.list().mosaics.includes(req.body.mosaic)) throw new Err(400, null, 'Invalid Mosaic');

            const model = await Model.from(config.pool, req.body.model_id);

            if (!model.storage) throw new Err(400, null, 'Model has not been uploaded');
            if (!model.active) throw new Err(400, null, 'Model has not been set as active');

            const proj = await Project.generate(config.pool, {
                ...req.body,
                uid: req.auth.id
            });

            const json = proj.serialize();
            json.model_name = model.name;
            return res.json(json);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/project/:projectid', {
        name: 'Patch Project',
        group: 'Projects',
        auth: 'user',
        description: 'Update an existing project',
        ':projectid': 'integer',
        body: 'req.body.PatchProject.json',
        res: 'res.Project.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const proj = await Project.has_auth(config.pool, req.auth, req.params.projectid);
            await proj.commit(req.body);

            const json = proj.serialize();
            const model = await Model.from(config.pool, json.model_id);
            json.model_name = model.name;
            return res.json(json);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/project/:projectid', {
        name: 'Delete Project',
        group: 'Projects',
        auth: 'user',
        description: 'Archive a project',
        ':projectid': 'integer',
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const proj = await Project.has_auth(config.pool, req.auth, req.params.projectid);

            const insts = await Instance.list(config.pool, req.params.projectid);
            for (const inst of insts.instances) {
                if (inst.active) throw new Error(400, null, 'Cannot continue project deletion with active instance');

                const instance = new Instance();
                instance.id = inst.id;
                await instance.delete();
            }

            // TODO - Add support for paging aois/checkpoints/instances for projects with > 100 features
            const aois = await AOI.list(config.pool, req.params.projectid);
            aois.aois.forEach(async (a) => {
                const aoi = await AOI.from(config.pool, a.id);
                await aoi.commit({
                    archived: true
                });
            });

            const chkpts = await Checkpoint.list(config.pool, req.params.projectid);
            chkpts.checkpoints.forEach(async (c) => {
                const ch = await Checkpoint.from(config.pool, c.id);
                await ch.commit({
                    archived: true
                });
            });

            await proj.commit({
                archived: true
            });

            return res.json({
                status: 200,
                message: 'Project Deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
