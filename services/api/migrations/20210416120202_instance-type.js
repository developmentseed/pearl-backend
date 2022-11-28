export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            ADD COLUMN type TEXT;

        UPDATE instances SET type='gpu';

        ALTER TABLE instances
            ALTER COLUMN type SET NOT NULL;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            DELETE COLUMN type;
    `);
}
