-- Consolidate site identity on UserAuth (epic #167, Option B). dpc-api no longer
-- stores its own accounts/passwords; it keeps a lightweight local mirror of the
-- UserAuth identity (keyed by username) that owns API keys and community state.
-- The API has no users yet, so there are no rows to migrate.

CREATE TABLE users (
    id                UUID PRIMARY KEY,
    userauth_username VARCHAR(50)  NOT NULL UNIQUE,
    display_name      VARCHAR(50),
    avatar_url        VARCHAR(512),
    bio               VARCHAR(500),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Repoint API-key ownership from the retired accounts table to users. Dropping the
-- column removes its foreign key to accounts and the owner index; both are recreated
-- against users. Safe because api_keys is empty.
DROP INDEX IF EXISTS idx_api_keys_owner_id;
ALTER TABLE api_keys DROP COLUMN owner_id;

DROP TABLE accounts;

ALTER TABLE api_keys ADD COLUMN owner_id UUID NOT NULL REFERENCES users(id);
CREATE INDEX idx_api_keys_owner_id ON api_keys (owner_id);
