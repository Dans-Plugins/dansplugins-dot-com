package com.dansplugins.api.repository;

import com.dansplugins.api.entity.Account;
import com.dansplugins.api.entity.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {

    boolean existsByKeyHash(String keyHash);

    Optional<ApiKey> findByKeyHash(String keyHash);

    List<ApiKey> findByOwner(Account owner);
}
