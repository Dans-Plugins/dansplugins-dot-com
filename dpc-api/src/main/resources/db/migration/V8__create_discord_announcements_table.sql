-- Stores announcements ingested from the community Discord server's
-- announcements channel so they can be surfaced as posts on the website's News
-- page. This migration is purely additive: it creates one new table and its
-- indexes and does not alter or touch the factions tables in any way.
--
-- Rows are upserted by message_id (see DiscordAnnouncementService): an
-- announcement is inserted once and updated in place if the Discord message is
-- edited. The ingestion path never deletes rows, so a Discord outage or an
-- empty fetch cannot wipe previously-ingested announcements.
CREATE TABLE discord_announcements (
    id          UUID PRIMARY KEY,
    message_id  VARCHAR(32)  NOT NULL,
    channel_id  VARCHAR(32)  NOT NULL,
    content     TEXT         NOT NULL,
    author      VARCHAR(255),
    message_url VARCHAR(512),
    posted_at   TIMESTAMPTZ  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- One row per Discord message; the upsert path looks rows up by message_id.
CREATE UNIQUE INDEX idx_discord_announcements_message_id_unique
    ON discord_announcements (message_id);

-- The News feed reads announcements newest-first.
CREATE INDEX idx_discord_announcements_posted_at
    ON discord_announcements (posted_at DESC);
