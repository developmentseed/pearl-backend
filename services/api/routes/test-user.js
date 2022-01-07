const { Err } = require('@openaddresses/batch-schema');
const User = require('../lib/user');
const Token = require('../lib/token');

async function router(schema, config) {
    if (config.test) {
        await schema.post('/user', {}, async (req, res) => {
            try {
                req.body.auth0Id = '123' + req.body.username;
                const usr = await User.generate(config.pool, req.body);

                const tkn = await Token.generate(config.pool, {
                    uid: usr.id,
                    name: 'auth0'
                }, config.SigningSecret);

                usr.token = tkn.token;

                return res.json(usr);
            } catch (err) {
                return Err.respond(err, res);
            }
        });
    }
}

module.exports = router;
