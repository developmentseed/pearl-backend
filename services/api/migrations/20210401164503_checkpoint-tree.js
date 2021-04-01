exports.up = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            ADD COLUMN parent BIGINT;

        ALTER TABLE checkpoints
            ADD CONSTRAINT fk_parent
            FOREIGN KEY (parent)
            REFERENCES checkpoints(id);
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(`
        ALTER TABLE checkpoints
            DROP CONSTRAINT fk_parent;

        ALTER TABLE checkpoints
            DROP COLUMN parent;
    `);
}
