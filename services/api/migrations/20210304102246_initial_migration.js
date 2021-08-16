exports.up = function(knex) {
    return knex.schema.raw(`
        CREATE EXTENSION IF NOT EXISTS POSTGIS;
        CREATE EXTENSION IF NOT EXISTS PGCrypto;
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS users (
            id          BIGSERIAL PRIMARY KEY,
            auth0_id    TEXT UNIQUE NOT NULL,
            access      TEXT NOT NULL,
            flags       JSONB NOT NULL,
            username    TEXT UNIQUE NOT NULL,
            email       TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users_tokens (
            id          BIGSERIAL,
            name        TEXT NOT NULL,
            token       TEXT PRIMARY KEY,
            created     TIMESTAMP NOT NULL DEFAULT NOW(),
            uid         BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS models (
            id                      BIGSERIAL PRIMARY KEY,
            created                 TIMESTAMP NOT NULL DEFAULT NOW(),
            active                  BOOLEAN,
            uid                     BIGINT,

            name                    TEXT,

            model_type              TEXT,
            model_zoom              INT,
            model_inputshape        INT[],

            storage                 BOOLEAN,
            classes                 JSONB,
            meta                    JSONB
        );

        CREATE TABLE IF NOT EXISTS projects (
            id                      BIGSERIAL PRIMARY KEY,
            uid                     BIGINT NOT NULL,
            name                    TEXT NOT NULL,
            created                 TIMESTAMP NOT NULL DEFAULT NOW(),
            model_id                BIGINT NOT NULL,
            mosaic                  TEXT NOT NULL,

            CONSTRAINT fk_model
                FOREIGN KEY (model_id)
                REFERENCES models(id),

            CONSTRAINT fk_user
                FOREIGN KEY (uid)
                REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS instances (
            id          BIGSERIAL PRIMARY KEY,
            project_id  BIGINT NOT NULL,
            active      BOOLEAN NOT NULL DEFAULT False,
            created     TIMESTAMP NOT NULL DEFAULT NOW(),

            CONSTRAINT fk_project
                FOREIGN KEY (project_id)
                REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS checkpoints (
            id          BIGSERIAL PRIMARY KEY,

            name        TEXT NOT NULL,
            classes     JSONB,

            project_id  BIGINT NOT NULL,
            created     TIMESTAMP NOT NULL DEFAULT NOW(),
            storage     BOOLEAN NOT NULL DEFAULT False,

            CONSTRAINT fk_project
                FOREIGN KEY (project_id)
                REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS aois (
            id              BIGSERIAL PRIMARY KEY,
            name            TEXT NOT NULL,
            checkpoint_id   BIGINT NOT NULL,
            project_id      BIGINT NOT NULL,
            bounds          GEOMETRY(POLYGON, 4326),
            created         TIMESTAMP NOT NULL DEFAULT NOW(),
            storage         BOOLEAN NOT NULL DEFAULT False,

            CONSTRAINT fk_project
                FOREIGN KEY (project_id)
                REFERENCES projects(id),

            CONSTRAINT fk_checkpoint
                FOREIGN KEY (checkpoint_id)
                REFERENCES checkpoints(id)
        );
    `);
}

exports.down = function(knex) {
    return knex.schema.raw(``);
}
