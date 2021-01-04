const express = require('express');
const argv = require('minimist')(process.argv, {
    boolean: ['dev']
});

const PORT = 2000;

if (require.main === module) {
    return server();
}

/**
 * @param {Object} args
 * @param {Config} config
 * @param {function} cb
 */
async function server(args, config, cb) {

    console.error(`ok - running http://localhost:${PORT}`);
}
