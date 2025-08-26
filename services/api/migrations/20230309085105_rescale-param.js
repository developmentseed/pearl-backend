function up(knex) {
    return knex.schema.raw(`
        UPDATE mosaics
            SET params = '{"assets": ["B04", "B03", "B02", "B08"], "collection": "sentinel-2-l2a", "rescale": "0,10000"}'
            WHERE id='2849689f57f1b3b9c1f725abb75aa411';

        UPDATE mosaics
            SET params = '{"assets": ["B04", "B03", "B02", "B08"], "collection": "sentinel-2-l2a", "rescale": "0,10000"}'
            WHERE id='dce67bf58e5c9dbcf9393776f13f9ebd';

        UPDATE mosaics
            SET params = '{"assets": ["B04", "B03", "B02", "B08"], "collection": "sentinel-2-l2a", "rescale": "0,10000"}'
            WHERE id='da05434b9b6a177a6999078221e19481';

        UPDATE mosaics
            SET params = '{"assets": ["B04", "B03", "B02", "B08"], "collection": "sentinel-2-l2a", "rescale": "0,10000"}'
            WHERE id='9406dbfba1d5416dc521857008180079';
    `);
}

function down(knex) {
    return knex.schema.raw(`
        UPDATE mosaics
            SET params = '{"assets": ["B04", "B03", "B02", "B08"], "collection": "sentinel-2-l2a"}'
            WHERE id='2849689f57f1b3b9c1f725abb75aa411';

        UPDATE mosaics
            SET params = '{"assets": ["B04", "B03", "B02", "B08"], "collection": "sentinel-2-l2a"}'
            WHERE id='dce67bf58e5c9dbcf9393776f13f9ebd';

        UPDATE mosaics
            SET params = '{"assets": ["B04", "B03", "B02", "B08"], "collection": "sentinel-2-l2a"}'
            WHERE id='da05434b9b6a177a6999078221e19481';

        UPDATE mosaics
            SET params = '{"assets": ["B04", "B03", "B02", "B08"], "collection": "sentinel-2-l2a"}'
            WHERE id='9406dbfba1d5416dc521857008180079';
    `);
}

export {
    up,
    down
}
