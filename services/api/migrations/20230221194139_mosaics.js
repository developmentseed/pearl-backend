function up(knex) {
    return knex.schema.raw(`
        INSERT INTO mosaics (id, imagery_source_id, name, params, mosaic_ts_start, mosaic_ts_end)
            VALUES (
                '2849689f57f1b3b9c1f725abb75aa411', 2,
                'Sentinel-2 Dec 2019 - March 2020',
                '{"assets": ["B03", "B02"], "color_formula":"Gamma+RGB+3.2+Saturation+0.8+Sigmoidal+RGB+25+0.35", "collection": "sentinel-2-l2a"}'::JSON,
                '2019-12-01'::TIMESTAMP,
                '2020-03-31'::TIMESTAMP
            );


        INSERT INTO mosaics (id, imagery_source_id, name, params, mosaic_ts_start, mosaic_ts_end)
            VALUES (
                'dce67bf58e5c9dbcf9393776f13f9ebd', 2,
                'Sentinel-2 Dec 2020 - March 2021',
                '{"assets": ["B03", "B02"], "color_formula":"Gamma+RGB+3.2+Saturation+0.8+Sigmoidal+RGB+25+0.35", "collection": "sentinel-2-l2a"}'::JSON,
                '2020-12-01'::TIMESTAMP,
                '2021-03-31'::TIMESTAMP
            );


        INSERT INTO mosaics (id, imagery_source_id, name, params, mosaic_ts_start, mosaic_ts_end)
            VALUES (
                'da05434b9b6a177a6999078221e19481', 2,
                'Sentinel-2 Dec 2021 - March 2022',
                '{"assets": ["B03", "B02"], "color_formula":"Gamma+RGB+3.2+Saturation+0.8+Sigmoidal+RGB+25+0.35", "collection": "sentinel-2-l2a"}'::JSON,
                '2021-12-01'::TIMESTAMP,
                '2022-03-31'::TIMESTAMP
            );

        INSERT INTO mosaics (id, imagery_source_id, name, params, mosaic_ts_start, mosaic_ts_end)
            VALUES (
                '9406dbfba1d5416dc521857008180079', 2,
                'Sentinel-2 Dec 2022 - Feb 2023',
                '{"assets": ["B03", "B02"], "color_formula":"Gamma+RGB+3.2+Saturation+0.8+Sigmoidal+RGB+25+0.35", "collection": "sentinel-2-l2a"}'::JSON,
                '2022-12-01'::TIMESTAMP,
                '2023-02-28'::TIMESTAMP
            );


        UPDATE mosaics
            SET
                params = '{
                    "assets": "image",
                    "asset_bidx": "image|1,2,3,4",
                    "collection": "naip"
                }'::JSONB
            WHERE id = 1;

    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
