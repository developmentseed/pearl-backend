const { promisify } = require('util');
const request = promisify(require('request'));
const jwt = require('jsonwebtoken');

/**
 * @class API
 */
class API {
    constructor(base, SigningSecret) {
        this.base = base;

        this.token = 'api.' + jwt.sign({
            t: 'admin'
        }, SigningSecret);

    }

    async meta() {
        const url = new URL(this.base + '/api');

        console.error(`ok - GET ${url}`);
        const res = await request({
            json: true,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            url: url
        });
        console.error(`ok - RES ${url} ${res.statusCode}`);

        return res;
    }

    async schemas() {
        const url = new URL(this.base + '/api/websocket');

        console.error(`ok - GET ${url}`);
        const res = await request({
            json: true,
            method: 'GET',
            url: url
        });
        console.error(`ok - RES ${url} ${res.statusCode}`);

        return res;
    }

    async deactivate() {
        const url = new URL(this.base + '/api/instance');

        console.error(`ok - DELETE ${url}`);
        const res = await request({
            json: true,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            url: url
        });
        console.error(`ok - RES ${url} ${res.statusCode}`);

        return res;
    }

    async instance_state(projectid, instanceid, active) {
        const url = new URL(this.base + `/api/project/${projectid}/instance/${instanceid}`);

        console.error(`ok - PATCH ${url}`);
        const res = await request({
            json: true,
            method: 'PATCH',
            url: url,
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: {
                active: active
            }
        });
        console.error(`ok - RES ${url} ${res.statusCode}`);

        return res;
    }
}

module.exports = API;
