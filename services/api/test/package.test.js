import pkg from '../package.json';
import test from 'tape';

test('Package Locked Deps', (t) => {

    // Updating to 12.8.0 resulted in a consistent error of
    // An HTTP header that's mandatory for this request is not specified
    // MissingRequiredHeader - x-ms-blob-type
    t.equals(pkg.dependencies['@azure/storage-blob'], '12.7.0', '@azure/storage-blob === 12.7.0');

    // Node Fetch 3.0 only supports resolution as an ES6 module via import
    t.equals(pkg.dependencies['node-fetch'], '^2.6.5', 'node-fetch === ^2.6.1');

    t.end();
});
