'use strict';

const {promisify} = require('util');
const request = promisify(require('request'));

/**
 * @class API
 */
class API {
    constructor(base) {
        this.base = base;
    }

    meta() {
        await request({
            json: true,
            method: 'GET',
            url: new URL(this.API + '/api')
        });
    }

    deactivate() {
        await request({
            json: true,
            method: 'DELETE',
            url: new URL(this.API + '/instance')
        });
    }

    state(id, active) {
        await request({
            json: true,
            method: 'PATCH',
            url: new URL(this.API + '/api')
        });
    }
}

module.exports = API;
