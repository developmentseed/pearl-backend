function up(knex) {
    return knex.schema.raw(`
        CREATE TABLE mosaic_groups (
            id          BIGSERIAL PRIMARY KEY,
            name        TEXT NOT NULL
        );

        ALTER TABLE mosaics
            ADD COLUMN group_id BIGINT REFERENCES mosaic_groups(id);

        INSERT INTO mosaic_groups (
            name
        ) VALUES (
            'NAIP'
        );

        UPDATE mosaics
            SET group_id = 1;

        ALTER TABLE mosaics
            ALTER COLUMN group_id SET NOT NULL;
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
