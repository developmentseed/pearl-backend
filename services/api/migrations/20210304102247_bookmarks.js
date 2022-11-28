export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            ADD COLUMN bookmarked BOOLEAN NOT NULL DEFAULT FALSE;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            DROP COLUMN bookmarked;
    `);
}
