# Database migrations

Flyway-managed schema migrations for the `dpc-api` module. Files in this
directory follow Flyway's `V<version>__<description>.sql` naming. They run
once each, in order, on every fresh database, and only newly-added files run
on existing databases.

## Adding a migration

1. Pick the next `V<N>` (no gaps, no repeats — Flyway tracks them in
   `flyway_schema_history`).
2. Write idempotent forward SQL only. Flyway has no automatic rollback.
3. If the change isn't backward-compatible with old running code, plan a
   two-phase rollout (e.g. add a nullable column → deploy code that writes
   to it → backfill → enforce NOT NULL in a follow-up migration).
4. Update the matching JPA entity in `entity/`.
5. `FlywayMigrationTest` (Testcontainers Postgres) catches drift between
   migrations and entities by booting the app with `hibernate.ddl-auto=validate`
   against a freshly-migrated DB. Run `./mvnw test` locally with Docker
   available, or rely on CI.

## Rolling back

Flyway does not undo migrations. If you need to revert one in production:

1. Manually run the reverse SQL against the database. For example, to undo
   `V7__add_faction_last_synced_at.sql`:
   ```sql
   DROP INDEX IF EXISTS idx_factions_server_id_active_synced;
   ALTER TABLE factions DROP COLUMN last_synced_at;
   ```
2. Delete the matching row from `flyway_schema_history` so Flyway will
   re-apply the migration if the same version number is later re-deployed.
3. Revert the corresponding code change. Note: rolling code back without
   rolling the schema back is sometimes safe (additive columns are
   compatible with old code that ignores them); rolling both back avoids
   the question entirely.

If you anticipate needing to revert a release, deploy schema changes that
are additive only (new nullable columns, new indexes) and gate use of the
new column behind a feature flag — this avoids needing to drop anything.

## Compatibility notes

* `TIMESTAMPTZ` is Postgres-specific; tests against H2 (the default test
  profile) skip the migrations entirely. `FlywayMigrationTest` uses
  Testcontainers Postgres so every column type and constraint is exercised
  against the real engine.
* Indexes are created without `CONCURRENTLY` because the tables are small
  enough that brief locks are acceptable. Revisit if any table grows past a
  few million rows.
