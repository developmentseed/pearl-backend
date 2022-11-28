export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE batch
            ADD COLUMN progress INT NOT NULL DEFAULT 0;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE batch
            DROP COLUMN progress;
    `);
}
