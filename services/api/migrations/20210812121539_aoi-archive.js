export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            ADD COLUMN archived BOOLEAN DEFAULT false;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            DROP COLUMN archived;
    `);
}
