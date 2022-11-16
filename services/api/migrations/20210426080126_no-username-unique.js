export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE users
            DROP CONSTRAINT users_username_key;
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE users
            ADD CONSTRAINT users_username_key UNIQUE (username);
    `);
}
