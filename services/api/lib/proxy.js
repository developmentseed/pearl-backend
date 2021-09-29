const request = require('request');
const { promisify } = require('util');
const arequest = promisify(request);

/**
 * @class Proxy
 */
class Proxy {
    constructor(config) {
        this.config = config;
    }

    /**
     * Proxy a request to the TiTiler
     *
     * @param {Object} req Express Request Object
     * @param {Object|boolean} res Express Response Object or false if the response
     *                             should be returned instead of piped
     */
    async request(req, res) {
        const url = new URL(this.config.TileUrl + req.url);

        for (const p of Object.keys(req.query)) {
            url.searchParams.append(p, req.query[p]);
        }

        try {
            if (res) {
                const pres = request({
                    url: url,
                    json: typeof req.body === 'object',
                    method: req.method,
                    body: req.body
                });

                if (res === true) {
                    return pres;
                } else {
                    pres.on('response', (proxres) => {
                        res.status(proxres.statusCode);
                        for (const h of ['content-type', 'content-length', 'content-encoding']) {
                            if (proxres.headers[h]) res.append(h, proxres.headers[h]);
                        }
                    }).pipe(res);
                }
            }

            return await arequest({
                url: url,
                json: typeof req.body === 'object',
                method: req.method,
                body: req.body
            });
        } catch (err) {
            throw new Error(err);
        }

    }
}

module.exports = Proxy;
