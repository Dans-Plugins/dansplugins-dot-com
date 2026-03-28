CREATE TABLE accounts (
    id            UUID PRIMARY KEY,
    username      VARCHAR(255)    NOT NULL UNIQUE,
    password_hash VARCHAR(255)    NOT NULL,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

ALTER TABLE api_keys ADD COLUMN owner_id UUID NOT NULL REFERENCES accounts(id);
CREATE INDEX idx_api_keys_owner_id ON api_keys (owner_id);
