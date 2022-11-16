export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE models
            ADD COLUMN bounds GEOMETRY(POLYGON, 4326);
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE models
            DROP COLUMN bounds;
    `);
}
