package com.dansplugins.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * A local mirror of one open (or recently-open) GitHub issue or pull request from
 * the Dans-Plugins org, refreshed by the scheduled sync in BacklogSyncService.
 * GitHub remains the system of record for state; a row here flips to CLOSED
 * (rather than being deleted) when a sync no longer sees it in the open set, so
 * the console can show "recently closed" without a second source of truth.
 */
@Entity
@Table(name = "backlog_items", uniqueConstraints =
        @UniqueConstraint(name = "uq_backlog_item", columnNames = {"repo", "number"}))
@Getter
@Setter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class BacklogItem {

    public enum ItemType { ISSUE, PULL_REQUEST }

    public enum State { OPEN, CLOSED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(lombok.AccessLevel.NONE)
    private UUID id;

    @Column(name = "repo", nullable = false, length = 100)
    @Setter(lombok.AccessLevel.NONE)
    private String repo;

    @Column(name = "number", nullable = false)
    @Setter(lombok.AccessLevel.NONE)
    private int number;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 16)
    private ItemType itemType;

    @Column(name = "title", nullable = false, length = 512)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false, length = 16)
    private State state;

    @Column(name = "draft", nullable = false)
    private boolean draft;

    @Column(name = "author_login", length = 100)
    private String authorLogin;

    @Column(name = "html_url", nullable = false, length = 512)
    private String htmlUrl;

    @Column(name = "comment_count", nullable = false)
    private int commentCount;

    @Column(name = "github_created_at", nullable = false)
    private Instant githubCreatedAt;

    @Column(name = "github_updated_at", nullable = false)
    private Instant githubUpdatedAt;

    @Column(name = "last_synced_at", nullable = false)
    private Instant lastSyncedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Instant updatedAt;

    public BacklogItem(String repo, int number, ItemType itemType) {
        this.repo = repo;
        this.number = number;
        this.itemType = itemType;
    }

    /** A stable key for cross-referencing this item from likes/claims/feature requests: "repo#number". */
    public String targetId() {
        return repo + "#" + number;
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
