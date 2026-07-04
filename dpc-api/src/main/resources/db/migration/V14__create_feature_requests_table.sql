-- Community-submitted plugin ideas (#233), scoped to a repo. Upvotes reuse the
-- existing likes table (target_type = 'feature_request', target_id = this
-- row's id) rather than a second voting mechanism.

CREATE TABLE feature_requests (
    id                  UUID PRIMARY KEY,
    repo                VARCHAR(100)  NOT NULL,
    title               VARCHAR(200)  NOT NULL,
    description         VARCHAR(4000) NOT NULL,
    author_id           UUID          NOT NULL REFERENCES users(id),
    status              VARCHAR(16)   NOT NULL,
    converted_issue_url VARCHAR(512),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_feature_requests_repo ON feature_requests (repo);
