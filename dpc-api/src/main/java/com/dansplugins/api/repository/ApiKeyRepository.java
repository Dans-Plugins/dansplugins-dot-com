package com.dansplugins.api.repository;

import com.dansplugins.api.entity.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {

    boolean existsByKeyHash(String keyHash);
}
