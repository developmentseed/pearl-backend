import Err from '@openaddresses/batch-error';
import User from '../lib/types/user.js';
import Token from '../lib/types/token.js';

export default async function router(schema, config) {
    if (config.test) {
        await schema.post('/user', {
            body: {
                type: 'object',
                properties: {
                    username: {
                        type: 'string'
                    },
                    email: {
                        type: 'string'
                    }
                }
            },
            res: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    auth0_id: { type: 'string' },
                    access: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    created: { type: 'integer' },
                    updated: { type: 'integer' },
                    token: { type: 'string' },
                    flats: { type: 'object' }
                }
            }
        }, async (req, res) => {
            try {
                req.body.auth0Id = '123' + req.body.username;
                const usr = (await User.generate(config.pool, req.body)).serialize();

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
