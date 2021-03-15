exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE models
            ADD COLUMN bounds GEOMETRY(POLYGON, 4326);
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE models
            DROP COLUMN bounds;
    `);
}
