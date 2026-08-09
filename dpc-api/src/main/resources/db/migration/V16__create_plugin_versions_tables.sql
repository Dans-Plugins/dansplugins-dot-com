-- A local mirror of each plugin's GitHub releases, so a resource page can show
-- version history, changelogs and download counts without calling GitHub on
-- every request (and without being rate-limited into showing nothing).
--
-- DPC never hosts plugin files: download_url points at the asset on GitHub, and
-- the row here is metadata about a file that lives somewhere else. See
-- RESOURCE_HUB.md for why hosting was rejected.
--
-- Both tables are written only by ReleaseSyncService. GitHub stays the system of
-- record: the sync deletes rows for releases GitHub no longer reports, rather
-- than keeping a second, divergent history.

CREATE TABLE plugin_versions (
    id             UUID PRIMARY KEY,
    plugin_id      UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    tag            VARCHAR(128) NOT NULL,
    -- The release title. GitHub allows it to be empty, in which case the page
    -- falls back to the tag, so this is nullable rather than NOT NULL.
    name           VARCHAR(256),
    -- The release body, author-written Markdown. Capped rather than TEXT so a
    -- pathological release note cannot grow a row without bound; the sync
    -- truncates to fit.
    changelog      VARCHAR(20000),
    html_url       VARCHAR(512) NOT NULL,
    prerelease     BOOLEAN NOT NULL DEFAULT FALSE,
    published_at   TIMESTAMPTZ NOT NULL,
    last_synced_at TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- A tag is unique within a repository, which is what makes (plugin, tag) the
    -- upsert key the sync matches on.
    CONSTRAINT uq_plugin_version UNIQUE (plugin_id, tag)
);

-- The only read pattern: one plugin's versions, newest first.
CREATE INDEX idx_plugin_versions_plugin_published
    ON plugin_versions (plugin_id, published_at DESC);

CREATE TABLE plugin_version_assets (
    id                UUID PRIMARY KEY,
    plugin_version_id UUID NOT NULL REFERENCES plugin_versions(id) ON DELETE CASCADE,
    name              VARCHAR(256) NOT NULL,
    size_bytes        BIGINT NOT NULL,
    -- GitHub's own counter for the asset. Mirrored rather than counted here:
    -- the download itself never touches this service.
    download_count    INTEGER NOT NULL DEFAULT 0,
    download_url      VARCHAR(512) NOT NULL,
    CONSTRAINT uq_plugin_version_asset UNIQUE (plugin_version_id, name)
);
