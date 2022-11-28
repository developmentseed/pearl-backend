export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            ADD COLUMN geoms JSONB[];
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            DROP COLUMN geoms;
    `);
}
