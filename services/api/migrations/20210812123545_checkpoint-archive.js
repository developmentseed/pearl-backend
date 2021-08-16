exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            ADD COLUMN archived BOOLEAN DEFAULT false;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            DROP COLUMN archived;
    `);
}
