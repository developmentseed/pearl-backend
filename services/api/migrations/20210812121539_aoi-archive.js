exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            ADD COLUMN archived BOOLEAN DEFAULT false;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            DROP COLUMN archived;
    `);
}
