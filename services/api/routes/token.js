import Err from '@openaddresses/batch-error';
import Token from '../lib/types/token.js';

export default async function router(schema, config) {
    /**
     * @api {get} /api/token List Tokens
     * @apiVersion 1.0.0
     * @apiName ListTokens
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListTokens.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListTokens.json} apiSuccess
     */
    await schema.get('/token', {
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

    /**
     * @api {post} /api/token Create Token
     * @apiVersion 1.0.0
     * @apiName CreateToken
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiDescription
     *     Create a new API token to perform API requests with
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.CreateToken.json} apiParam
     * @apiSchema {jsonschema=../schema/res.Token.json} apiSuccess
     */
    await schema.post('/token', {
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

    /**
     * @api {delete} /api/token/:id Delete Token
     * @apiVersion 1.0.0
     * @apiName DeleteToken
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiDescription
     *     Delete an existing token
     *
     * @apiSchema {jsonschema=../schema/res.Standard.json} apiSuccess
     */
    await schema.delete('/token/:tokenid', {
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
