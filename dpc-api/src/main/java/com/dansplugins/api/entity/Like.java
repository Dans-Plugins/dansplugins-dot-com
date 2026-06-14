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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * A user's "like" of a target — a plugin or a guide, keyed by the plugin id from
 * pages/data/plugins.json. The unique constraint enforces one like per
 * (user, target_type, target_id), so liking is idempotent.
 */
// `LIKE` is a JPQL reserved word, so the JPQL entity name is "LikeRecord"
// (the table is still `likes`); explicit @Query strings reference LikeRecord.
@Entity(name = "LikeRecord")
@Table(name = "likes", uniqueConstraints =
        @UniqueConstraint(name = "uq_like", columnNames = {"user_id", "target_type", "target_id"}))
@Getter
@Setter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class Like {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(lombok.AccessLevel.NONE)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "target_type", nullable = false, length = 16)
    private String targetType;

    @Column(name = "target_id", nullable = false, length = 64)
    private String targetId;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Instant createdAt;

    public Like(User user, String targetType, String targetId) {
        this.user = user;
        this.targetType = targetType;
        this.targetId = targetId;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
