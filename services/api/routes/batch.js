import Err from '@openaddresses/batch-error';
import Batch from '../lib/types/batch.js';
import Project from '../lib/types/project.js';
import Instance from '../lib/types/instance.js';
import Checkpoint from '../lib/types/checkpoint.js';

export default async function router(schema, config) {
    await schema.get('/project/:projectid/batch', {
        name: 'List Batch',
        group: 'Batch',
        auth: 'user',
        description: 'Return a list of all batches for a given user',
        ':projectid': 'integer',
        query: 'req.query.ListBatches.json',
        res: 'res.ListBatches.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            req.query.uid = req.auth.id;
            req.query.projectid = req.params.projectid;
            res.json(await Batch.list(config.pool, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/project/:projectid/batch', {
        name: 'Create Batch',
        group: 'Batch',
        auth: 'user',
        description: 'Create a new batch',
        ':projectid': 'integer',
        body: 'req.body.CreateBatch.json',
        res: 'res.Batch.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            const existing_batch = await Instance.list(config.pool, req.params.projectid, {
                batch: true,
                status: 'active'
            });

            if (existing_batch.total > 0) {
                throw new Err(400, null, 'Failed to update Instance, there is already an active batch instance');
            }

            if (req.body.checkpoint_id) {
                await Checkpoint.has_auth(config.pool, req.auth, req.params.projectid, req.body.checkpoint_id);
            }

            req.body.uid = req.auth.id;
            req.body.project_id = req.params.projectid;
            const batch = await Batch.generate(config.pool, req.body);

            req.body.project_id = req.params.projectid;
            req.body.batch = batch.id;

            req.body.type = req.params.type ? req.params.type : 'cpu';

            req.body.uid = req.auth.id;
            const inst = await Instance.generate(config, req.body);

            const batch_json = batch.serialize();
            batch_json.instance = inst.id;

            return res.json(batch_json);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/batch/:batchid', {
        name: 'Get Batch',
        group: 'Batch',
        auth: 'user',
        description: 'Return a single batch',
        ':projectid': 'integer',
        ':batchid': 'integer',
        res: 'res.Batch.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const batch = await Batch.has_auth(config.pool, req.auth, req.params.projectid, req.params.batchid);

            return res.json(batch.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/project/:projectid/batch/:batchid', {
        name: 'Patch Batch',
        group: 'Batch',
        auth: 'user',
        description: 'Update a batch',
        ':projectid': 'integer',
        ':batchid': 'integer',
        body: 'req.body.PatchBatch.json',
        res: 'res.Batch.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const batch = await Batch.has_auth(config.pool, req.auth, req.params.projectid, req.params.batchid);
            await batch.commit(req.body);

            return res.json(batch.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
