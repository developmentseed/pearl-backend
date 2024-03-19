function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE mosaics
            ADD COLUMN ui_params JSONB NOT NULL DEFAULT '{}'::JSONB;

        UPDATE mosaics
            SET ui_params = params;

        UPDATE mosaics
            SET params = params - 'color_formula';
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
