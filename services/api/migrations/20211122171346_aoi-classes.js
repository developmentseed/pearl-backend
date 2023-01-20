export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            ADD COLUMN classes JSONB;

        UPDATE aois
            SET
                classes = checkpoints.classes
            FROM
                checkpoints
            WHERE
                aois.checkpoint_id = checkpoints.id;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            DROP COLUMN classes;
    `);
}
