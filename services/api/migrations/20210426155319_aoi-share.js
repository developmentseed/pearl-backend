exports.up = function(knex) {
    return knex.schema.raw(`
        CREATE TABLE aois_share (
            id          BIGINT,
            project_id  BIGINT,
            bounds      GEOMETRY(Polygon, 4326),
            created     TIMESTAMP DEFAULT NOW(),
            storage     BOOLEAN DEFAULT FALSE,
            uuid        UUID DEFAULT uuid_generate_v4(),
            patches     BIGINT[] DEFAULT '{}'::bigint[]
        );

        ALTER TABLE aois
            DROP COLUMN uuid;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        DROP TABLE aois_export;
    `);
}
