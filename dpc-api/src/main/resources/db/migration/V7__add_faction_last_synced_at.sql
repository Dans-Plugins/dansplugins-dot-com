-- Track the most recent successful sync per faction so a partial sync
-- (e.g. plugin transiently sees an empty/short faction list) cannot
-- immediately mass-deactivate factions. Combined with the deactivation
-- safety guard in FactionService, this keeps a single bad sync from
-- wiping the registry for a server.
ALTER TABLE factions ADD COLUMN last_synced_at TIMESTAMPTZ;
UPDATE factions SET last_synced_at = updated_at WHERE last_synced_at IS NULL;
ALTER TABLE factions ALTER COLUMN last_synced_at SET NOT NULL;
ALTER TABLE factions ALTER COLUMN last_synced_at SET DEFAULT now();

CREATE INDEX idx_factions_server_id_active_synced
    ON factions (server_id, active, last_synced_at);
