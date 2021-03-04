exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            ADD COLUMN bookmarked BOOLEAN NOT NULL DEFAULT FALSE;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            DROP COLUMN bookmarked;
    `);
}
