function up(knex) {
    return knex.schema.raw(`
        CREATE TABLE imagery_sources (
            id          BIGSERIAL PRIMARY KEY,
            created     TIMESTAMP NOT NULL DEFAULT Now(),
            updated     TIMESTAMP NOT NULL DEFAULT Now(),
            name        TEXT NOT NULL
        );

        ALTER TABLE mosaics
            ADD COLUMN source_id BIGINT REFERENCES imagery_sources(id);

        INSERT INTO imagery_sources (
            name
        ) VALUES (
            'NAIP'
        );

        UPDATE mosaics
            SET source_id = 1;

        ALTER TABLE mosaics
            ALTER COLUMN source_id SET NOT NULL;

        ALTER TABLE mosaics
            ADD COLUMN created TIMESTAMP NOT NULL DEFAULT Now();
        ALTER TABLE mosaics
            ADD COLUMN updated TIMESTAMP NOT NULL DEFAULT Now();
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
