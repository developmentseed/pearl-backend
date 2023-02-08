function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            DROP COLUMN aoi_id;

        ALTER TABLE instances
            ADD COLUMN timeframe_id BIGINT REFERENCES aoi_timeframe(id);
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
