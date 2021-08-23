'use strict';

const Err = require('../lib/error');
const { Param } = require('../lib/util');

async function router(schema, config) {
    const authtoken = new (require('../lib/auth').AuthToken)(config);

    /**
     * @api {get} /api/token List Tokens
     * @apiVersion 1.0.0
     * @apiName ListTokens
     * @apiGroup Token
     * @apiPermission user
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   [{
     *       "id": 1,
     *       "created": "<date>",
     *       "name": "Token Name"
     *   }]
     */
    await schema.get('/token', {}, config.requiresAuth, async (req, res) => {
        try {
            return res.json(await authtoken.list(req.auth));
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
     * @apiSchema (Body) {jsonschema=../schema/req.body.token.json} apiParam
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
    await schema.post('/token', {
        body: './req.body.token.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            return res.json(await authtoken.generate(req.auth, req.body.name));
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
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "status": 200,
     *       "message": "Token Deleted"
     *   }
     */
    await schema.delete('/token/:tokenid', {}, config.requiresAuth, async (req, res) => {
        try {
            await Param.int(req, 'tokenid');

            return res.json(await authtoken.delete(req.auth, req.params.tokenid));
        } catch (err) {
            return Err.respond(err, res);
        }
    });
}

module.exports = router;
