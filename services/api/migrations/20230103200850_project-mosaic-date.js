function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            RENAME TO aoi_timeframe;

        CREATE TABLE aois (
            id              BIGSERIAL PRIMARY KEY,
            name            TEXT NOT NULL,
            project_id      BIGINT NOT NULL REFERENCES projects(id),
            created         TIMESTAMP NOT NULL DEFAULT Now(),
            updated         TIMESTAMP NOT NULL DEFAULT Now(),
            bounds          GEOMETRY(POLYGON, 4326),
            archived        BOOLEAN NOT NULL DEFAULT False
        );

        INSERT INTO aois (
            name,
            project_id,
            created,
            bounds,
            archived
        ) SELECT
            name,
            project_id,
            created,
            bounds,
            archived
        FROM
            aoi_timeframe;

        ALTER TABLE aoi_timeframe
            ADD COLUMN aoi_id BIGINT REFERENCES aois(id);

        UPDATE aoi_timeframe
            SET
                aoi_id = aois.id
            FROM
                aois
            WHERE
                aoi_timeframe.project_id = aois.project_id
                AND aoi_timeframe.name = aois.name;

        ALTER TABLE aoi_timeframe
            ALTER COLUMN aoi_id SET NOT NULL;

        ALTER TABLE aoi_timeframe
            ALTER COLUMN patches SET NOT NULL;

        ALTER TABLE aoi_timeframe
            ALTER COLUMN px_stats SET NOT NULL;

        ALTER TABLE aoi_timeframe
            ALTER COLUMN archived SET NOT NULL;

        ALTER TABLE aoi_timeframe
            DROP COLUMN name;

        ALTER TABLE aoi_timeframe
            DROP COLUMN project_id;

        ALTER TABLE aoi_timeframe
            DROP COLUMN bounds;

        ALTER TABLE aoi_timeframe
            ADD COLUMN mosaic TEXT NOT NULL DEFAULT 'naip.latest';

        ALTER TABLE aoi_timeframe
            ADD COLUMN mosaic_ts TIMESTAMP NOT NULL DEFAULT Now();

        ALTER TABLE projects
            DROP COLUMN mosaic;

    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
