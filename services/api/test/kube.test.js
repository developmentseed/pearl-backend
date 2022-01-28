'use strict';
const test = require('tape');
const { Kube } = require('../lib/kube');
const Flight = require('./flight');

const flight = new Flight();

flight.init(test);
flight.takeoff(test);

test.skip('k8s list pods', async (t) => {
    const kube = new Kube('default');

    try {
        await kube.listPods();
    } catch (err) {
        t.error(err, 'no errors');
    }

    t.end();
});

flight.landing(test);
