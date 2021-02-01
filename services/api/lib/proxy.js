'use strict';

const request = require('request');

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
            request({
                url: url,
                method: 'GET'
            }).on('response', (proxres) => {
                res.status(proxres.statusCode);
                for (const h of ['content-type', 'content-length', 'content-encoding']) {
                    if (proxres.headers[h]) res.append(h, proxres.headers[h]);
                }
            }).pipe(res);
        } catch (err) {
            throw new Error(err);
        }

    }
}

module.exports = {
    Proxy
};
