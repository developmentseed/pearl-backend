exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE projects
            ADD COLUMN archived BOOLEAN DEFAULT false;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE projects
            DROP COLUMN archived;
    `);
}
