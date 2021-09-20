exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            ADD COLUMN bookmarked_at TIMESTAMP;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            DROP COLUMN bookmarked_at;
    `);
}
