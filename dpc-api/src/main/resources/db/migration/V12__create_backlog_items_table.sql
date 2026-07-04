-- Local mirror of open GitHub issues/PRs across the Dans-Plugins org, refreshed by
-- the scheduled sync (dev portal backlog console). GitHub stays authoritative for
-- state; a row flips to 'CLOSED' rather than being deleted when a sync no longer
-- sees it in the open set.

CREATE TABLE backlog_items (
    id                UUID PRIMARY KEY,
    repo              VARCHAR(100) NOT NULL,
    number            INTEGER      NOT NULL,
    item_type         VARCHAR(16)  NOT NULL,
    title             VARCHAR(512) NOT NULL,
    state             VARCHAR(16)  NOT NULL,
    draft             BOOLEAN      NOT NULL DEFAULT false,
    author_login      VARCHAR(100),
    html_url          VARCHAR(512) NOT NULL,
    comment_count     INTEGER      NOT NULL DEFAULT 0,
    github_created_at TIMESTAMPTZ  NOT NULL,
    github_updated_at TIMESTAMPTZ  NOT NULL,
    last_synced_at    TIMESTAMPTZ  NOT NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_backlog_item UNIQUE (repo, number)
);

-- Supports the console's per-repo grouping and the public summary aggregation.
CREATE INDEX idx_backlog_items_repo_state ON backlog_items (repo, state);
