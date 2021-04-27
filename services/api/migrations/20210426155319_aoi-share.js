exports.up = function(knex) {
    return knex.schema.raw(`
        CREATE TABLE aois_share (
            aoi_id      BIGINT NOT NULL,
            project_id  BIGINT NOT NULL,
            bounds      GEOMETRY(Polygon, 4326) NOT NULL,
            created     TIMESTAMP DEFAULT NOW(),
            storage     BOOLEAN DEFAULT FALSE,
            uuid        UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            patches     BIGINT[] DEFAULT '{}'::bigint[],

            CONSTRAINT fk_project
                FOREIGN KEY (project_id)
                REFERENCES projects(id),

            CONSTRAINT fk_aoi
                FOREIGN KEY (aoi_id)
                REFERENCES aois(id)
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
