'use strict';

async function genconfig() {
    return await require('../lib/config').env();

}

async function drop() {
    let config;
    try {
        config = await genconfig();

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
    } catch (err) {
        throw err;
    }

    return config;
}

module.exports = {
    drop,
    genconfig
};
