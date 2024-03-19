function up(knex) {
    return knex.schema.raw(`
ALTER TABLE aoi_timeframe_share DROP CONSTRAINT fk_aoi;
ALTER TABLE aoi_timeframe_share ADD CONSTRAINT fk_aoi FOREIGN KEY (aoi_id) REFERENCES aois(id);
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
