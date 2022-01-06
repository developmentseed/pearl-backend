exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE users
            DROP column flags;

        ALTER TABLE users
            ADD COLUMN created TIMESTAMP DEFAULT now();

        ALTER TABLE users
            ADD COLUMN updated TIMESTAMP DEFAULT now();
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(``);
}
