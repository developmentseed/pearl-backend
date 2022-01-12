exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE users
            ADD COLUMN flags JSONB NOT NULL DEFAULT '{}'::JSONB
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE users
            DROP COLUMN flags;
    `);
}
