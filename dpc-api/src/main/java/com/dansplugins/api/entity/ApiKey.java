package com.dansplugins.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "api_keys")
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
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

    public ApiKey(String keyHash, String serverName) {
        this.keyHash = keyHash;
        this.serverName = serverName;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
