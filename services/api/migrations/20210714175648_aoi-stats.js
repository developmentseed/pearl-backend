export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            ADD COLUMN px_stats JSONB DEFAULT '{}'::JSONB;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            DROP COLUMN px_stats;
    `);
}
