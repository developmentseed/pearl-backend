const test = require('tape');
const { Flight } = require('./util');
const flight = new Flight();
const { Kube } = require('../lib/kube');

main();

async function main() {
  flight.takeoff(test);
  const kube = new Kube('default');
  test('k8s list pods', async (t) => {
    const pods = await kube.listPods()
    t.pass();
    t.end();
  })
  flight.landing(test);
}