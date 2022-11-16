export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            ADD COLUMN bookmarked_at TIMESTAMP;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            DROP COLUMN bookmarked_at;
    `);
}
