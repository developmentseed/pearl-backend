exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            ADD COLUMN type TEXT NOT NULL;

        UPDATE instances SET type='gpu';
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            DELETE COLUMN type;
    `);
}
