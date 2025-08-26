function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE aoi_timeframe_share
            ADD COLUMN published BOOLEAN NOT NULL DEFAULT False;
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
