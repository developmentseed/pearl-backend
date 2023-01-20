import Err from '@openaddresses/batch-error';
import Token from '../lib/types/token.js';

export default async function router(schema, config) {
    await schema.get('/token', {
        name: 'List Tokens',
        group: 'Token',
        auth: 'user',
        description: 'List Tokens',
        query: 'req.query.ListTokens.json',
        res: 'res.ListTokens.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const list = await Token.list(config.pool, req.auth);

            // Legacy - eventually should return a standard list like other endpoints (list vs list.tokens);
            return res.json(list.tokens);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.post('/token', {
        name: 'Create Tokens',
        group: 'Token',
        auth: 'user',
        description: 'Create a new API token to perform API requests with',
        body: 'req.body.CreateToken.json',
        res: 'res.Token.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            if (!req.auth.type !== 'auth0') throw new Err(400, null, 'Only an Auth0 token can create a API token');

            const token = await Token.generate(config.pool, {
                uid: req.auth.id,
                name: req.body.name
            }, config.SigningSecret);
            return res.json(token.serialize());
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    await schema.delete('/token/:tokenid', {
        name: 'Delete Token',
        group: 'Token',
        auth: 'user',
        description: 'Delete an existing token',
        ':tokenid': 'integer',
        res: 'res.Standard.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const token = await Token.from(config.pool, req.params.tokenid);
            await token.delete(config.pool);

            return res.json({
                status: 200,
                message: 'Token Deleted'
            });
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}
