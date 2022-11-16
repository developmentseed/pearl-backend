export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            ADD COLUMN analytics JSONB;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            DROP COLUMN analytics;
    `);
}
