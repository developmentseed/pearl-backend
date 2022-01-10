const { Err } = require('@openaddresses/batch-schema');
const User = require('../lib/user');

async function router(schema, config) {

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
     * @apiSchema (Query) {jsonschema=../schema/req.query.ListUsers.json} apiParam
     * @apiSchema {jsonschema=../schema/res.ListUsers.json} apiSuccess
     */
    await schema.get('/user', {
        query: 'req.query.ListUsers.json',
        res: 'res.ListUsers.json'
    }, config.requiresAuth, async (req, res) => {
        try {
            const users = await User.list(config.pool, req.query);

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
            id: req.auth.id,
            username: req.auth.username,
            email: req.auth.email,
            access: req.auth.access
        });
    });

}

module.exports = router;
