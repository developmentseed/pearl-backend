function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE imagery_sources
            ADD COLUMN collection_id TEXT;
        UPDATE imagery_sources
            SET collection_id = 'sentinel-2-l2a'
            WHERE name = 'Sentinel-2';
        UPDATE imagery_sources
            SET collection_id = 'naip'
            WHERE name = 'NAIP';
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
