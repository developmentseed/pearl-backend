'use strict';

const { Client } = require('pg');

async function drop() {
    const config = require('../lib/config').env();

    const client = new Client({
        connectionString: config.Postgres
    });

    try {
        await client.connect();

        const pgres = await client.query(`
            SELECT
                'drop table "' || tablename || '" cascade;' AS drop
            FROM
                pg_tables
            WHERE
                schemaname = 'public'
                AND tablename != 'spatial_ref_sys'
        `)

        for (const r of pgres.rows) {
            await client.query(r.drop);
        }

        await client.end();
    } catch (err) {
        throw err;
    }

    return config;
}

module.exports = drop;
