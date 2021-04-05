'use strict';

const fs = require('fs');
const path = require('path');
const test = require('tape');

const glob = require('glob');

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
