package com.dansplugins.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * A user's claim on a backlog issue/PR — "I'm working on this" — recorded here
 * rather than as a native GitHub assignee so that claiming never requires
 * granting a visitor collaborator access to the repo. At most one claim on a
 * given (repo, number) is active at a time (released_at is null); the
 * corresponding partial unique index lives in the V13 migration since Hibernate
 * cannot express a filtered unique constraint declaratively.
 */
@Entity
@Table(name = "claims")
@Getter
@Setter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(lombok.AccessLevel.NONE)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @Setter(lombok.AccessLevel.NONE)
    private User user;

    @Column(name = "repo", nullable = false, length = 100)
    @Setter(lombok.AccessLevel.NONE)
    private String repo;

    @Column(name = "number", nullable = false)
    @Setter(lombok.AccessLevel.NONE)
    private int number;

    @Column(name = "claimed_at", nullable = false, updatable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Instant claimedAt;

    @Column(name = "released_at")
    private Instant releasedAt;

    public Claim(User user, String repo, int number) {
        this.user = user;
        this.repo = repo;
        this.number = number;
    }

    public String targetId() {
        return repo + "#" + number;
    }

    public boolean isActive() {
        return releasedAt == null;
    }

    @PrePersist
    protected void onCreate() {
        this.claimedAt = Instant.now();
    }
}
