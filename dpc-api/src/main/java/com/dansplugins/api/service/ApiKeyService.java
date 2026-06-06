package com.dansplugins.api.service;

import com.dansplugins.api.repository.ApiKeyRepository;
import com.dansplugins.api.util.HashUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for validating API keys by comparing SHA-256 hashes.
 */
@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;

    @Transactional(readOnly = true)
    public boolean isValidKey(String rawKey) {
        String keyHash = HashUtil.sha256(rawKey);
        return apiKeyRepository.existsByKeyHash(keyHash);
    }
}
