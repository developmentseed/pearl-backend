'use strict';

const fetch = require('node-fetch');
const Err = require('./error');

class Param {
    static async int(req, name) {
        req.params[name] = Number(req.params[name]);
        if (isNaN(req.params[name])) throw new Err(400, null, `${name} param must be an integer`);
    }
}

/**
 * Performs a request to the given url returning the response in json format
 * or throwing an error.
 *
 * @param {string} url Url to query
 * @param {object} options Options for fetch
 */
async function fetchJSON(url, options) {
    let response;
    try {
        response = await fetch(url, options);
        const json = await response.json();

        if (response.status >= 400) {
            const err = new Error(json.message);
            err.statusCode = response.status;
            err.data = json;
            throw err;
        }

        return { body: json, headers: response.headers };
    } catch (error) {
        error.statusCode = response ? response.status || null : null;
        throw error;
    }
}



module.exports = {
    Param,
    fetchJSON
};

