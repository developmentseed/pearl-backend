exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            ADD COLUMN is_batch BOOLEAN NOT NULL DEFAULT False;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            DROP COLUMN is_batch;
    `);
}
