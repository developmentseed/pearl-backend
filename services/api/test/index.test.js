'use strict';

const test = require('tape');
const { Flight } = require('./util');

const flight = new Flight();

main();

async function main() {

    // Start test server
    await flight.takeoff(test);

    // Get an API Token
    const { token } = await flight.user(test);

    // Execute tests in sequence
    await (require('./model.test')(flight, token));
    await (require('./mosaic.test')(flight, token));

    // End server
    await flight.landing(test);
}
