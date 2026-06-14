-- Likes on plugins and guides (#169). One like per (user, target_type, target_id);
-- targets are keyed by the plugin id from pages/data/plugins.json.

CREATE TABLE likes (
    id          UUID PRIMARY KEY,
    user_id     UUID         NOT NULL REFERENCES users(id),
    target_type VARCHAR(16)  NOT NULL,
    target_id   VARCHAR(64)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_like UNIQUE (user_id, target_type, target_id)
);

-- Supports the public per-target count aggregation.
CREATE INDEX idx_likes_target ON likes (target_type, target_id);
