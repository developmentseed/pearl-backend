import { promisify } from 'node:util';
import request from 'request';
import fs from 'node:fs';
import path from 'node:path';

const prequest = promisify(request);

function local_schema() {
    const local = JSON.parse(fs.readFileSync(new URL('./schema.json', import.meta.url)));
    return local;
}

async function schema(url) {
    const res = await prequest({
        json: true,
        method: 'GET',
        url: new URL('/api/schema', url)
    });

    if (res.statusCode !== 200) throw new Error(res.body.message ? res.body.message : res.body);

    const local = local_schema();
    local.schema = res.body;

    fs.writeFileSync(new URL('./schema.json', import.meta.url), JSON.stringify(local, null, 4));

    return local;
}

export default {
    schema,
    local_schema
};
