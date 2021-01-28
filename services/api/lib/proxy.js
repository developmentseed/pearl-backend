'use strict';

const { promisify } = require('util');
const request = promisify(require('request'));

/**
 * @class Proxy
 */
class Proxy {
    constructor(config) {
        this.config = config;
    }

    async request(req, res) {
        const url = new URL(this.config.TileUrl + req.url);

        for (const p of Object.keys(req.query)) {
            url.searchParams.append(p, req.query[p]);
        }

        try {
            const proxres = await request({
                url: url,
                method: 'GET'
            });

            res.status(proxres.statusCode);

            for (const h of ['content-type', 'content-length']) {
                if (proxres.headers[h]) res.append(h, proxres.headers[h]);
            }

            res.send(proxres.body);
        } catch (err) {
            throw new Error(err);
        }

    }
}

module.exports = {
    Proxy
};
