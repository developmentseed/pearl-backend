exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE batch
            ADD COLUMN progress INT NOT NULL DEFAULT 0;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE batch
            DROP COLUMN progress;
    `);
}
