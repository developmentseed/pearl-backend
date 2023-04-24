function up(knex) {
    return knex.schema.raw(`
        DELETE FROM batch;

        ALTER TABLE batch
            DROP COLUMN aoi;
        ALTER TABLE batch
            DROP COLUMN name;

        ALTER TABLE batch
            ADD COLUMN aoi BIGINT NOT NULL REFERENCES aois(id);

        ALTER TABLE batch
            ADD COLUMN timeframe BIGINT REFERENCES aoi_timeframe(id);

        ALTER TABLE batch
            ADD COLUMN mosaic TEXT NOT NULL DEFAULT 'naip.latest';

        ALTER TABLE batch
            DROP COLUMN bounds;
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
