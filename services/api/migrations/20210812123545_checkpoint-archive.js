export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            ADD COLUMN archived BOOLEAN DEFAULT false;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            DROP COLUMN archived;
    `);
}
