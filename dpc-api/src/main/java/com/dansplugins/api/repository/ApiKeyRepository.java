package com.dansplugins.api.repository;

import com.dansplugins.api.entity.ApiKey;
import com.dansplugins.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {

    boolean existsByKeyHash(String keyHash);

    boolean existsByOwner(User owner);

    List<ApiKey> findByOwner(User owner);
}
