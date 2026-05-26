-- Record the most recent successful sync per faction. FactionService.syncFactions
-- updates this on every upsert; nothing reads it yet. It is a forward-looking
-- hook so a future staleness-based deactivation pass (e.g. "deactivate factions
-- whose last_synced_at < now - 2 * sync_interval") can be added without another
-- schema migration. The actual safety against mass-deactivation today lives in
-- FactionService.applyDeactivationGuard (minimum-incoming / ratio / absolute
-- guards) — see dpc-api/README.md "Sync safety guards".
ALTER TABLE factions ADD COLUMN last_synced_at TIMESTAMPTZ;
UPDATE factions SET last_synced_at = updated_at WHERE last_synced_at IS NULL;
ALTER TABLE factions ALTER COLUMN last_synced_at SET NOT NULL;
ALTER TABLE factions ALTER COLUMN last_synced_at SET DEFAULT now();

CREATE INDEX idx_factions_server_id_active_synced
    ON factions (server_id, active, last_synced_at);
