export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE users
            ADD COLUMN flags JSONB NOT NULL DEFAULT '{}'::JSONB
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE users
            DROP COLUMN flags;
    `);
}
