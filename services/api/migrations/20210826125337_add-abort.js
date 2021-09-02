exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE batch
            ADD COLUMN abort BOOLEAN NOT NULL DEFAULT False;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE batch
            DROP COLUMN abort;
    `);
}
