export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE projects
            ADD COLUMN archived BOOLEAN DEFAULT false;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE projects
            DROP COLUMN archived;
    `);
}
