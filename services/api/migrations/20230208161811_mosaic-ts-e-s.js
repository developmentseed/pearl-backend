function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE mosaics
            DROP COLUMN mosaic_ts;
        ALTER TABLE mosaics
            ADD COLUMN mosaic_ts_start TIMESTAMP;
        ALTER TABLE mosaics
            ADD COLUMN mosaic_ts_end TIMESTAMP;

        INSERT INTO imagery_sources (
            name
        ) VALUES (
            'Sentinel-2'
        );
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
