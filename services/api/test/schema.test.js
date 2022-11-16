import fs from 'fs';
import path from 'path';
import test from 'tape';

import glob from 'glob';

glob.sync(path.resolve(__dirname, '../schema/**/*.json')).forEach((source) => {
    test(`schema/${path.parse(source).base}`, (t) => {
        const file = fs.readFileSync(source);
        t.ok(file.length, 'file loaded');

        try {
            JSON.parse(file);
        } catch (err) {
            t.error(err, 'no errors');
        }
        t.end();
    });
});
