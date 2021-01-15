const {promisify} = require('util');
const request = promisify(require('request'));

/**
 * @class Proxy
 */
class Proxy {
    constructor(config) {
        this.config = config;
    }

    async request(req, res) {

    }
}

module.exports = {
   Proxy
}
