const Err = require('../lib/error');
const { Auth, AuthToken } = require('../lib/auth');

async function router(schema, config) {
    const user = new Auth(config);
    const token = new AuthToken(config);

    if (config.test) {
        await schema.post('/user', {}, async (req, res) => {
            try {
                req.body.auth0Id = '123';
                const usr = await user.create(req.body);

                const tkn = await token.generate({
                    uid: usr.uid,
                    type: 'auth0'
                }, 'Test Token');

                usr.token = tkn.token;

                return res.json(usr);
            } catch (err) {
                return Err.respond(err, res);
            }
        });
    }
}

module.exports = router;
