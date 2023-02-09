function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE models
            ADD imagery_source_id BIGINT REFERENCES imagery_sources(id);

        UPDATE models
            SET imagery_source_id = 1;

        ALTER TABLE models
            ALTER COLUMN imagery_source_id SET NOT NULL;

        ALTER TABLE mosaics
            RENAME COLUMN source_id TO imagery_source_id;
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
