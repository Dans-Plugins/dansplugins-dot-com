package com.dansplugins.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * A community-submitted idea for one plugin, scoped to a repo but not yet a
 * GitHub issue. Upvotes reuse the existing Like mechanism (targetType
 * "feature_request", targetId this row's id) rather than a bespoke voting
 * table. Once triaged, {@link com.dansplugins.api.service.FeatureRequestService}
 * converts it into a real GitHub issue so ideas end up in the same backlog
 * everything else lives in, instead of a second, parallel one.
 */
@Entity
@Table(name = "feature_requests")
@Getter
@Setter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class FeatureRequest {

    public enum Status { OPEN, CONVERTED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(lombok.AccessLevel.NONE)
    private UUID id;

    @Column(name = "repo", nullable = false, length = 100)
    private String repo;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", nullable = false, length = 4000)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    @Setter(lombok.AccessLevel.NONE)
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private Status status;

    @Column(name = "converted_issue_url", length = 512)
    private String convertedIssueUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Instant createdAt;

    public FeatureRequest(String repo, String title, String description, User author) {
        this.repo = repo;
        this.title = title;
        this.description = description;
        this.author = author;
        this.status = Status.OPEN;
    }

    /** The id under which this row's upvotes are keyed in the likes table. */
    public String targetId() {
        return id.toString();
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
