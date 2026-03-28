package com.dansplugins.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "api_keys")
public class ApiKey {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "key_hash", nullable = false, unique = true, length = 64)
    private String keyHash;

    @Column(name = "server_name", nullable = false)
    private String serverName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ApiKey() {
    }

    public ApiKey(String keyHash, String serverName) {
        this.keyHash = keyHash;
        this.serverName = serverName;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getKeyHash() {
        return keyHash;
    }

    public String getServerName() {
        return serverName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
