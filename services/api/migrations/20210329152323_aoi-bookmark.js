export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            ADD COLUMN bookmarked BOOLEAN NOT NULL DEFAULT FALSE;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            DROP COLUMN bookmarked;
    `);
}
