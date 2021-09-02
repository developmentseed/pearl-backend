exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE batch
            ADD COLUMN error TEXT;

        ALTER TABLE batch
            ADD COLUMN status TEXT;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE batch
            DROP COLUMN error;

        ALTER TABLE batch
            DROP COLUMN status;
    `);
}
