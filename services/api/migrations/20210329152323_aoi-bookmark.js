exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            ADD COLUMN bookmarked BOOLEAN NOT NULL DEFAULT FALSE;
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            DROP COLUMN bookmarked;
    `);
}
