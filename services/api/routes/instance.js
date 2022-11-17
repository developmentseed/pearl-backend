import Err from '@openaddresses/batch-error';
import Project from '../lib/types/project.js';
import Instance from '../lib/types/instance.js';
import User from '../lib/types/user.js';
import Kube from '../lib/kube.js';

export default async function router(schema, config) {
    await schema.post('/project/:projectid/instance', {
        name: 'Create Instance',
        group: 'Instance',
        auth: 'user',
        description: `
            Instruct the GPU pool to start a new model instance and return a time limited session
            token for accessing the websockets GPU API
        `,
        ':projectid': 'integer',
        body: 'req.body.CreateInstance.json',
        res: 'res.Instance.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            req.body.project_id = req.params.projectid;
            req.body.uid = req.auth.id;
            req.body.type = req.body.type ? req.body.type : 'cpu';
            let podList = [];
            let active_cpus = 0;
            let active_gpus = 0;
            let availability = {
                'cpu': true,
                'gpu': true
            };

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

                    availability = {
                        'cpu': config.CpuCount - active_cpus > 0 ? true : false,
                        'gpu': config.GpuCount - active_gpus > 0 ? true : false
                    };

                    if (!availability[req.body.type]) {
                        return Err.respond(new Err(400, null, 'cpu/gpu not available'), res);
                    }
                }
            }

            const inst = await Instance.generate(config, req.body);

            res.json(inst.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/project/:projectid/instance/:instanceid', {
        name: 'Patch Instance',
        group: 'Instance',
        auth: 'admin',
        description: 'Update an instance state',
        ':projectid': 'integer',
        ':instanceid': 'integer',
        body: 'req.body.PatchInstance.json',
        res: 'res.Instance.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            const instance = await Instance.from(config, req.auth, req.params.instanceid);
            await instance.commit(req.body);

            return res.json(instance.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/instance', {
        name: 'List Instances',
        group: 'Instance',
        auth: 'user',
        description: `
            Return a list of instances. Note that users can only get their own instances and use of the \`uid\`
            field will be pinned to their own uid. Admins can filter by any uid or none.
        `,
        ':projectid': 'integer',
        query: 'req.query.ListInstances.json',
        res: 'res.ListInstances.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await Project.has_auth(config.pool, req.auth, req.params.projectid);

            res.json(await Instance.list(config.pool, req.params.projectid, req.query));
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/project/:projectid/instance/:instanceid', {
        name: 'Get Instance',
        group: 'Instance',
        auth: 'user',
        description: 'Return all information about a given instance',
        ':projectid': 'integer',
        ':instanceid': 'integer',
        res: 'res.Instance.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const instance = await Instance.has_auth(config, req.auth, req.params.projectid, req.params.instanceid);

            return res.json(instance.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/instance/:instanceid', {
        name: 'Self Instance',
        group: 'Instance',
        auth: 'admin',
        description: `
            A newly instantiated GPU Instance does not know what it's project id is. This API
            allows ONLY AN ADMIN TOKEN to fetch any instance, regardless of project
        `,
        ':instanceid': 'integer',
        res: 'res.Instance.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            const instance = await Instance.from(config, req.auth, req.params.instanceid);

            return res.json(instance.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/instance', {
        name: 'Deactivate Instances',
        group: 'Instance',
        auth: 'admin',
        description: 'Set all instances to active: false - used by the socket server upon initial api connection'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            await Instance.reset(config.pool);

            return res.json({
                status: 200,
                messages: 'Instances Reset'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
