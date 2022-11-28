export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE users
            DROP column flags;

        ALTER TABLE users
            ADD COLUMN created TIMESTAMP DEFAULT now();

        ALTER TABLE users
            ADD COLUMN updated TIMESTAMP DEFAULT now();
    `);
}

export function down(knex) {
    return knex.schema.raw(``);
}
