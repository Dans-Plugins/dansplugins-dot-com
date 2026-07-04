-- "I'm working on this" claims for the dev-portal backlog console (#232). A
-- claim is a dpc-api record, not a native GitHub assignee — visitors never need
-- collaborator access to claim something. At most one active (released_at is
-- null) claim per (repo, number); history (released claims) is kept, not
-- deleted, so past releases stay auditable.

CREATE TABLE claims (
    id          UUID PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users(id),
    repo        VARCHAR(100) NOT NULL,
    number      INTEGER      NOT NULL,
    claimed_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    released_at TIMESTAMPTZ
);

-- Hibernate's ddl-auto=validate only checks tables/columns, not indexes, so
-- this filtered uniqueness guard is enforced here and backed up by an
-- application-level check in ClaimService before insert.
CREATE UNIQUE INDEX uq_claims_active_target ON claims (repo, number) WHERE released_at IS NULL;

CREATE INDEX idx_claims_user_active ON claims (user_id) WHERE released_at IS NULL;
