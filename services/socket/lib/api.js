'use strict';

const { promisify } = require('util');
const request = promisify(require('request'));

/**
 * @class API
 */
class API {
    constructor(base) {
        this.base = base;
    }

    async meta() {
        const url = new URL(this.base + '/api');

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
            url: url
        });
        console.error(`ok - RES ${url} ${res.statusCode}`);

        return res;
    }

    async state(projectid, instanceid, active) {
        const url = new URL(this.base + `/api/project/${projectid}/instance/${instanceid}`);

        console.error(`ok - PATCH ${url}`);
        const res = await request({
            json: true,
            method: 'PATCH',
            url: url,
            body: {
                active: active
            }
        });
        console.error(`ok - RES ${url} ${res.statusCode}`);

        return res;
    }
}

module.exports = API;
