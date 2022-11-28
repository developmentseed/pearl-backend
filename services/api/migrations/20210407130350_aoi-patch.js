export function up(knex) {
    return knex.schema.raw(`
        CREATE TABLE IF NOT EXISTS aoi_patch (
            id          BIGSERIAL PRIMARY KEY,
            project_id  BIGINT NOT NULL,
            aoi_id      BIGINT NOT NULL,
            created     TIMESTAMP NOT NULL DEFAULT NOW(),
            storage     BOOLEAN NOT NULL DEFAULT FALSE,

            CONSTRAINT fk_project
                FOREIGN KEY (project_id)
                REFERENCES projects(id),

            CONSTRAINT fk_aoi
                FOREIGN KEY (aoi_id)
                REFERENCES aois(id)
        );
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        DROP TABLE aoi_patch;
    `);
}
