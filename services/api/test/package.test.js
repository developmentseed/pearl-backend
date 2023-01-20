import fs from 'fs';
import test from 'tape';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));

test('Package Locked Deps', (t) => {

    // Updating to 12.8.0 resulted in a consistent error of
    // An HTTP header that's mandatory for this request is not specified
    // MissingRequiredHeader - x-ms-blob-type
    t.equals(pkg.dependencies['@azure/storage-blob'], '12.7.0', '@azure/storage-blob === 12.7.0');

    t.end();
});
