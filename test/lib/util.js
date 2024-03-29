import { promisify } from 'util';
import request from 'request';
import fs from 'fs';
import path from 'path';

const prequest = promisify(request);

export function local_schema() {
    const local = JSON.parse(fs.readFileSync(new URL('./schema.json', import.meta.url)));
    return local;
}

export default async function schema(url) {
    const res = await prequest({
        json: true,
        method: 'GET',
        url: new URL(`/api/schema`, url)
    });

    if (res.statusCode !== 200) throw new Error(res.body.message ? res.body.message : res.body);

    const local = local_schema();
    local.schema = res.body;

    fs.writeFileSync(new URL('./schema.json', import.meta.url), JSON.stringify(local, null, 4));

    return local;
}
