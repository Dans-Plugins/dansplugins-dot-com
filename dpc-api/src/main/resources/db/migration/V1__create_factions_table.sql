CREATE TABLE factions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255)    NOT NULL,
    server_id   VARCHAR(255)    NOT NULL,
    member_count INTEGER        NOT NULL DEFAULT 0,
    description TEXT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_factions_server_id ON factions (server_id);
