import Err from '@openaddresses/batch-error';
import User from '../lib/types/user.js';
import { sql } from 'slonik';

export default async function router(schema, config) {
    await schema.get('/user', {
        name: 'List Users',
        group: 'User',
        auth: 'admin',
        description: 'Return a list of users that have registered with the service',
        query: 'req.query.ListUsers.json',
        res: 'res.ListUsers.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            const users = await User.list(config.pool, req.query);

            return res.json(users);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.patch('/user/:userid', {
        name: 'Patch User',
        group: 'User',
        auth: 'admin',
        description: 'Update information about a user',
        ':userid': 'integer',
        body: 'req.body.PatchUser.json',
        res: 'res.User.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);

            const user = await User.from(config.pool, req.params.userid);

            await user.commit({
                ...req.body,
                updated: sql`NOW()`
            });

            return res.json(user.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.get('/user/me', {
        name: 'Session Metadata',
        group: 'User',
        auth: 'user',
        description: 'Return basic user information about the currently authenticated user',
        res: 'res.Me.json'
    }, config.requiresAuth, async (req, res) => {
        return res.json({
            id: req.auth.id,
            username: req.auth.username,
            email: req.auth.email,
            access: req.auth.access,
            created: req.auth.created,
            updated: req.auth.updated,
            flags: req.auth.flags
        });
    });

    await schema.get('/user/:userid', {
        name: 'Get User',
        group: 'User',
        auth: 'admin',
        description: 'Return all information about a given user',
        ':userid': 'integer',
        res: 'res.User.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            await User.is_admin(req);
            const user = await User.from(config.pool, req.params.userid);
            return res.json(user.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
