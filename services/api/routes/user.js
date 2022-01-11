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
     * @api {patch} /api/user/:userid Patch User
     * @apiVersion 1.0.0
     * @apiName PatchUser
     * @apiGroup User
     * @apiPermission admin
     *
     * @apiDescription
     *     Update information about a user
     *
     * @apiSchema (Body) {jsonschema=../schema/req.body.PatchUser.json} apiParam
     * @apiSchema {jsonschema=../schema/res.User.json} apiSuccess
     */
    await schema.patch('/user/:userid', {
        ':userid': 'integer',
        body: 'req.body.PatchUser.json',
        res: 'res.User.json'
    }, config.requiresAuth, async (req, res) => {
        await User.is_admin(req);

        const user = await User.from(config.pool, req.params.userid);
        user.patch(req.body);
        await user.commit(config.pool);

        return res.json(user.serialize());
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
            access: req.auth.access,
            created: req.auth.created,
            updated: req.auth.updated
        });
    });

    /**
     * @api {get} /api/user/:userid Get User
     * @apiVersion 1.0.0
     * @apiName GetUser
     * @apiGroup User
     * @apiPermission admin
     *
     * @apiDescription
     *     Return all information about a given user
     *
     * @apiSchema {jsonschema=../schema/res.User.json} apiSuccess
     */
    await schema.get('/user/:userid', {
        ':userid': 'integer',
        res: 'res.User.json'
    }, config.requiresAuth, async (req, res) => {
        await User.is_admin(req);

        const user = await User.from(config.pool, req.params.userid);
        return res.json(user.serialize());
    });
}

module.exports = router;
