exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            ADD COLUMN analytics JSONB;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            DROP COLUMN analytics;
    `);
}
