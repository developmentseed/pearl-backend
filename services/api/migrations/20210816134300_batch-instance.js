export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            ADD COLUMN is_batch BOOLEAN NOT NULL DEFAULT False;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            DROP COLUMN is_batch;
    `);
}
