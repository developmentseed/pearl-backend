export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE batch
            ADD COLUMN abort BOOLEAN NOT NULL DEFAULT False;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE batch
            DROP COLUMN abort;
    `);
}
