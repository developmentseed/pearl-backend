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
        const proxres = await request({
            url: this.config.TileUrl + req.url,
            method: 'GET'
        });

        res.status(proxres.statusCode)

        for (const h of ['content-type', 'content-length']) {
            if (proxres.headers[h]) res.append(h, proxres.headers[h])
        }

        res.send(proxres.body)
    }
}

module.exports = {
    Proxy
}
