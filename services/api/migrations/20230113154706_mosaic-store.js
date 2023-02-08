function up(knex) {
    return knex.schema.raw(`
        CREATE TABLE mosaics (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            params      JSONB NOT NULL DEFAULT '{}',
            mosaic_ts   TIMESTAMP
        );

        INSERT INTO mosaics (
            id,
            name,
            params
        ) VALUES (
            '87b72c66331e136e088004fba817e3e8',
            'naip.latest',
            '{
                "assets": "image",
                "asset_bidx": "image|1,2,3",
                "collection": "naip"
            }'::JSONB
        );
    `);
}

function down(knex) {
    return knex.schema.raw(``);
}

export {
    up,
    down
}
