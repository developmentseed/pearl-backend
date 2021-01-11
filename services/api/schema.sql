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
    access      TEXT NOT NULL,
    flags       JSONB NOT NULL,
    username    TEXT UNIQUE NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users_tokens (
    id          BIGSERIAL,
    name        TEXT,
    token       TEXT PRIMARY KEY,
    created     TIMESTAMP,
    uid         BIGINT
);

CREATE TABLE IF NOT EXISTS users_reset (
    uid         BIGINT,
    expires     TIMESTAMP,
    token       TEXT
);

CREATE TABLE IF NOT EXISTS models (
    id          BIGSERIAL PRIMARY KEY,
    created     TIMESTAMP,
    active      BOOLEAN
);

CREATE TABLE IF NOT EXISTS instances (
    id          BIGSERIAL PRIMARY KEY,
    uid         BIGINT,
    created     TIMESTAMP,
    model_id    BIGINT
);
