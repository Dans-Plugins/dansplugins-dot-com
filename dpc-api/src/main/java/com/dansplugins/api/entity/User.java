package com.dansplugins.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Local mirror of a UserAuth identity. UserAuth owns authentication and carries no
 * profile data, so dpc-api keeps this row — created on a user's first authenticated
 * request — to hold the community profile (display name, avatar, bio) and to give a
 * stable internal id that API keys (and, later, likes) are owned by. Keyed to the
 * UserAuth username, which is the only identifier a validated token carries.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(lombok.AccessLevel.NONE)
    private UUID id;

    @Column(name = "userauth_username", nullable = false, unique = true, length = 50)
    @Setter(lombok.AccessLevel.NONE)
    private String userauthUsername;

    @Column(name = "display_name", length = 50)
    private String displayName;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @Column(name = "bio", length = 500)
    private String bio;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Instant updatedAt;

    public User(String userauthUsername) {
        this.userauthUsername = userauthUsername;
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
