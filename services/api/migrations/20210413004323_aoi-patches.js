export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            ADD COLUMN patches BIGINT[] DEFAULT '{}'::BIGINT[];

        UPDATE aois
            SET patches = '{}'::BIGINT[];
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE aois
            DROP COLUMN patches;
    `);
}
