exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            DROP COLUMN is_batch;

        ALTER TABLE instances
            ADD COLUMN batch BIGINT;

        CREATE TABLE batch (
            id          BIGSERIAL PRIMARY KEY,
            uid         BIGINT NOT NULL,
            project_id  BIGINT NOT NULL,
            created     TIMESTAMP NOT NULL DEFAULT NOW(),
            updated     TIMESTAMP NOT NULL DEFAULT NOW(),
            aoi         BIGINT,
            name        TEXT NOT NULL,
            bounds      GEOMETRY(POLYGON, 4326) NOT NULL,
            completed   BOOLEAN NOT NULL DEFAULT False,

            CONSTRAINT fk_aoi
                FOREIGN KEY (aoi)
                REFERENCES aois(id),

            CONSTRAINT fk_project
                FOREIGN KEY (project_id)
                REFERENCES projects(id)
        );
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            ADD COLUMN is_batch BOOLEAN NOT NULL DEFAULT False;

        UPDATE instances
            SET is_batch = True
            WHERE batch IS NOT NULL;

        ALTER TABLE instances
            DROP COLUMN is_batch;
    `);
}
