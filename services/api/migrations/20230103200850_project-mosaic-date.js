function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE projects
            ADD COLUMN mosaic_ts TIMESTAMP;
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
