import test from 'tape';
import Kube from '../lib/kube.js';
import Flight from './flight.js';

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
