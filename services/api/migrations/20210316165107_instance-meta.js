export function up(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            ADD COLUMN last_update TIMESTAMP NOT NULL DEFAULT NOW();

        ALTER TABLE instances
            ADD COLUMN aoi_id BIGINT;

        ALTER TABLE instances
            ADD COLUMN checkpoint_id BIGINT;

        ALTER TABLE instances
            ADD CONSTRAINT fk_aoi
                FOREIGN KEY (aoi_id)
                REFERENCES aois(id);

        ALTER TABLE instances
            ADD CONSTRAINT fk_checkpoint
                FOREIGN KEY (checkpoint_id)
                REFERENCES checkpoints(id);
    `);
}

export function down(knex) {
    return knex.schema.raw(`
        ALTER TABLE instances
            DROP COLUMN last_update;

        ALTER TABLE instances
            DROP COLUMN aoi_id;

        ALTER TABLE instances
            DROP COLUMN checkpoint_id;
    `);
}
