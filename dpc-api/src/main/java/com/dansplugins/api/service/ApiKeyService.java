package com.dansplugins.api.service;

import com.dansplugins.api.entity.ApiKey;
import com.dansplugins.api.repository.ApiKeyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;

    @Transactional
    public String register(String serverName) {
        String rawKey = UUID.randomUUID().toString();
        String keyHash = sha256(rawKey);
        apiKeyRepository.save(new ApiKey(keyHash, serverName));
        return rawKey;
    }

    @Transactional(readOnly = true)
    public boolean isValidKey(String rawKey) {
        String keyHash = sha256(rawKey);
        return apiKeyRepository.existsByKeyHash(keyHash);
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
