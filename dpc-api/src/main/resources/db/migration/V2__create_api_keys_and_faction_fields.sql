CREATE TABLE api_keys (
    id          UUID PRIMARY KEY,
    key_hash    VARCHAR(64)     NOT NULL UNIQUE,
    server_name VARCHAR(255)    NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

ALTER TABLE factions ADD COLUMN server_ip    VARCHAR(255);
ALTER TABLE factions ADD COLUMN discord_link VARCHAR(255);
