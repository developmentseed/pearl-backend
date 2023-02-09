function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE imagery_sources
            ADD COLUMN bounds GEOMETRY(Polygon, 4326);

        UPDATE imagery_sources
            SET bounds = ST_MakeEnvelope(-180, -85.0511287798066, 180, 85.0511287798066, 4326);
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
