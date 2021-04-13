exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            ADD COLUMN patches BIGINT[] DEFAULT '{}'::BIGINT[];

        UPDATE aois
            SET patches = '{}'::BIGINT[];
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            DROP COLUMN patches;
    `);
}
