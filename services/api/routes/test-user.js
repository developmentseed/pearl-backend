'use strict';

const Err = require('../lib/error');
const { Param } = require('../lib/util');
const { Auth } = require('../lib/auth');

async function router(schema, config) {
    const user = new Auth(config);

    if (config.test) {
        await schema.post('/user', {}, async (req, res) => {
            try {
                req.body.auth0Id = '123';
                req.body.access = 'admin';
                const usr = await user.create(req.body);

                return res.json(usr);
            } catch (err) {
                return Err.respond(err, res);
            }
        });
    }
}

module.exports = router;
