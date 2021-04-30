exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE users
            DROP CONSTRAINT users_username_key;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE users
            ADD CONSTRAINT users_username_key UNIQUE (username);
    `);
}
