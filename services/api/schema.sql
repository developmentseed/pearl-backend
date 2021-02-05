CREATE EXTENSION IF NOT EXISTS POSTGIS;

CREATE TABLE IF NOT EXISTS session (
    sid         VARCHAR NOT NULL COLLATE "default",
    sess        JSON NOT NULL,
    expire      TIMESTAMP(6) NOT NULL,
    UNIQUE (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS=FALSE);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session ("expire");

CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    auth0_id    UNIQUE TEXT,
    access      TEXT NOT NULL,
    flags       JSONB NOT NULL,
    username    TEXT UNIQUE NOT NULL,
    email       TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users_tokens (
    id          BIGSERIAL,
    name        TEXT,
    token       TEXT PRIMARY KEY,
    created     TIMESTAMP,
    uid         BIGINT
);

CREATE TABLE IF NOT EXISTS projects (
    id                      BIGSERIAL PRIMARY KEY,
    uid                     BIGINT,
    name                    TEXT NOT NULL,
    created                 TIMESTAMP,
)

CREATE TABLE IF NOT EXISTS models (
    id                      BIGSERIAL PRIMARY KEY,
    created                 TIMESTAMP,
    active                  BOOLEAN,
    uid                     BIGINT,

    name                    TEXT,

    model_type              TEXT,
    model_finetunelayer     INT,
    model_numparams         BIGINT,
    model_inputshape        INT[],

    storage                 BOOLEAN,
    classes                 JSONB,
    meta                    JSONB
);

CREATE TABLE IF NOT EXISTS instances (
    id          BIGSERIAL PRIMARY KEY,
    uid         BIGINT,
    active      BOOLEAN,
    created     TIMESTAMP,
    model_id    BIGINT,
    mosaic      TEXT
);

CREATE TABLE IF NOT EXISTS aois (
    id          BIGSERIAL PRIMARY KEY,
    instance_id BIGINT,
    bounds      GEOMETRY(POLYGON, 4326),
    created     TIMESTAMP,
    storage     BOOLEAN
);

CREATE TABLE IF NOT EXISTS checkpoints (
    id          BIGSERIAL PRIMARY KEY,
    instance_id BIGINT,
    created     TIMESTAMP,
    storage     BOOLEAN
);
