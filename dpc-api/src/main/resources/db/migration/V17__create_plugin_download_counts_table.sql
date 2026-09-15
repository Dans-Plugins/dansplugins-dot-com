-- Downloads made through dansplugins.com, counted here — as distinct from
-- plugin_version_assets.download_count, which is GitHub's counter for every
-- download from anywhere (Dan's Plugin Manager, the release page, this site).
-- A download link on the site goes through dpc-api, which adds one to the
-- matching row and redirects to the file on GitHub; the bytes still never pass
-- through this service.
--
-- Keyed by (plugin, tag, asset name) rather than by the asset row on purpose:
-- ReleaseSyncService replaces a release's asset rows on every sync, and a
-- release GitHub stops reporting is deleted outright, so a counter on either
-- table would be reset by the next sync. A download that happened stays
-- counted toward the plugin's total whatever GitHub later does to the
-- release, which is what a "total downloads" figure means.
--
-- Written only by PluginDownloadService.

CREATE TABLE plugin_download_counts (
    id                  UUID PRIMARY KEY,
    plugin_id           UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    tag                 VARCHAR(128) NOT NULL,
    asset_name          VARCHAR(256) NOT NULL,
    download_count      BIGINT NOT NULL DEFAULT 0,
    first_downloaded_at TIMESTAMPTZ NOT NULL,
    last_downloaded_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_plugin_download_count UNIQUE (plugin_id, tag, asset_name)
);

-- The read patterns: one plugin's counters (summed for a total, grouped by tag
-- for a version), and everything grouped by plugin for the catalogue page. The
-- unique constraint's index serves both, plugin_id leading.
