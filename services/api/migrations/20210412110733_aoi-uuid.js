exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
        ADD COLUMN uuid UUID NOT NULL DEFAULT uuid_generate_v4();
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
        DROP COLUMN uuid;
    `);
}
