const { Err } = require('@openaddresses/batch-schema');

async function router(schema, config) {
    const auth = new (require('../lib/auth').Auth)(config);

    /**
     * @api {get} /api/user List Users
     * @apiVersion 1.0.0
     * @apiName ListUsers
     * @apiGroup User
     * @apiPermission admin
     *
     * @apiDescription
     *     Return a list of users that have registered with the service
     *
     * @apiSchema (Query) {jsonschema=../schema/req.query.user-list.json} apiParam
     *
     * @apiSuccessExample Success-Response:
     *   HTTP/1.1 200 OK
     *   {
     *       "total": 1,
     *       "users": [{
     *           "id": 1,
     *           "username": "example",
     *           "email": "example@example.com",
     *           "access": "user",
     *       }]
     *   }
     */
    await schema.get('/user', {
        query: 'req.query.user-list.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const users = await auth.list(req.query);

            return res.json(users);
        } catch (err) {
            return Err.respond(err, res);
        }
    });

    /**
     * @api {get} /api/user/me Get User Session Metadata
     * @apiVersion 1.0.0
     * @apiName self
     * @apiGroup User
     * @apiPermission user
     *
     * @apiDescription
     *     Return basic user information about the currently authenticated user
     *
     * @apiSchema {jsonschema=../schema/res.Me.json} apiSuccess
     */
    await schema.get('/user/me', {
        res: 'res.Me.json'
    }, config.requiresAuth, async (req, res) => {
        return res.json({
            username: req.auth.username,
            email: req.auth.email,
            access: req.auth.access
        });
    });

}

module.exports = router;
