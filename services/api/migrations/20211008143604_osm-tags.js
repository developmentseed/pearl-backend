exports.up = function(knex) {
    return knex.schema.raw(`
        CREATE TABLE osmtag (
            id          BIGSERIAL PRIMARY KEY,
            tagmap      JSONB,
            project_id  BIGINT REFERENCES projects(id)
        );

        ALTER TABLE models
            ADD COLUMN osmtag_id BIGINT
            REFERENCES osmtag(id);

        ALTER TABLE checkpoints
            ADD COLUMN osmtag_id BIGINT
            REFERENCES osmtag(id);
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        DROP TABLE osmtags;
    `);
}
