CREATE TABLE factions (
    id          UUID PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    server_id   VARCHAR(255)    NOT NULL,
    member_count INTEGER        NOT NULL DEFAULT 0,
    description TEXT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_factions_server_id ON factions (server_id);
CREATE UNIQUE INDEX idx_factions_name_server_id_unique ON factions (name, server_id);
