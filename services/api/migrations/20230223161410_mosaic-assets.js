function up(knex) {
    return knex.schema.raw(`
        UPDATE mosaics
            SET
                params = '{"assets": ["B04", "B03", "B02"], "collection": "sentinel-2-l2a", "color_formula": "Gamma+RGB+3.2+Saturation+0.8+Sigmoidal+RGB+25+0.35"}'::JSONB
            WHERE
                name != 'naip.latest'
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
