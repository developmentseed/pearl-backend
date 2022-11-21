import { promisify } from 'util';
import request from 'request';
const arequest = promisify(request);

async function run(api, schema, method, url, payload, stream = false) {
    const req = {
        json: true,
        url: url,
        method: method,
        headers: {}
    };

    if (api.user.username && api.user.password) {
        req.auth = {
            'user': api.user.username,
            'pass': api.user.password
        };
    }

    if (api.user.token) {
        req.auth = {
            bearer: api.user.token
        };
    }

    if (schema.body) req.body = payload;

    try {
        if (stream) {
            return request(req).pipe(stream);
        } else {
            const res = await arequest(req);

            if (res.statusCode !== 200) {
                if (typeof res.body === 'object') {
                    if (res.body.message) {
                        throw new Error(res.statusCode, ': ' + res.body.message);
                    } else {
                        throw new Error(res.statusCode, ': ' + 'No .message');
                    }
                }

                throw new Error(res.body)
            }

            return res.body;
        }
    } catch (err) {
        throw err;
    }
}

module.exports = run;
