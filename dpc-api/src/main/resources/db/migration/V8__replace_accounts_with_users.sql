-- Consolidate site identity on UserAuth (epic #167, Option B). dpc-api no longer
-- stores its own accounts/passwords; it keeps a lightweight local mirror of the
-- UserAuth identity (keyed by username) that owns API keys and community state.
--
-- This migration preserves any existing rows. Even though the API has no human
-- users yet, prod can hold service identities (e.g. the account that owns the
-- MedievalFactions API key used to POST /api/v1/factions). Each account becomes a
-- users row REUSING ITS UUID, so api_keys.owner_id stays valid and no key is lost.

CREATE TABLE users (
    id                UUID PRIMARY KEY,
    userauth_username VARCHAR(50)  NOT NULL UNIQUE,
    display_name      VARCHAR(50),
    avatar_url        VARCHAR(512),
    bio               VARCHAR(500),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Carry existing identities over, keyed by username and keeping the same id so
-- existing api_keys.owner_id references remain valid. The password_hash is dropped
-- on purpose: authentication now lives in UserAuth, not dpc-api.
INSERT INTO users (id, userauth_username, display_name, created_at, updated_at)
SELECT id, username, username, created_at, now() FROM accounts;

-- Repoint API-key ownership from the retired accounts table to users WITHOUT
-- touching owner_id values (they already point at the carried-over ids). Drop only
-- the foreign key to accounts (discovered by catalog, name-agnostic), then re-add it
-- against users. The owner index is left in place.
DO $$
DECLARE fk_name text;
BEGIN
    SELECT conname INTO fk_name
      FROM pg_constraint
     WHERE conrelid = 'api_keys'::regclass
       AND contype  = 'f'
       AND confrelid = 'accounts'::regclass;
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE api_keys DROP CONSTRAINT ' || quote_ident(fk_name);
    END IF;
END $$;

DROP TABLE accounts;

ALTER TABLE api_keys
    ADD CONSTRAINT api_keys_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id);
