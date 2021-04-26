exports.up = function(knex) {
    return knex.schema.raw(`
        CREATE TABLE aois_export (
            id          BIGINT,
            project_id  BIGINT,
            bounds      GEOMETRY(Polygon, 4326),
            created     TIMESTAMP DEFAULT NOW(),
            storate     BOOLEAN DEFAULT FALSE,
            uuid        UUID DEFAULT uuid_generate_v4(),
            patches     BIGINT DEFAULT '{}'::bigint[]
        )
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        DROP TABLE aois_export;
    `);
}
