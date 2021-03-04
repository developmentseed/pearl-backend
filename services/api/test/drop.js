'use strict';

async function drop() {
    const config = await require('../lib/config').env();

    try {
        const pgres = await config.pool.query(`
            SELECT
                'drop table "' || tablename || '" cascade;' AS drop
            FROM
                pg_tables
            WHERE
                schemaname = 'public'
                AND tablename != 'spatial_ref_sys'
        `)

        for (const r of pgres.rows) {
            await config.pool.query(r.drop);
        }

        await config.pool.end();
    } catch (err) {
        throw err;
    }

    return config;
}

module.exports = drop;
