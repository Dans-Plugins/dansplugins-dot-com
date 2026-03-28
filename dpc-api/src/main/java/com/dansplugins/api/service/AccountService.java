package com.dansplugins.api.service;

import com.dansplugins.api.entity.Account;
import com.dansplugins.api.entity.ApiKey;
import com.dansplugins.api.repository.AccountRepository;
import com.dansplugins.api.repository.ApiKeyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final ApiKeyRepository apiKeyRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Account register(String username, String password) {
        if (accountRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already taken");
        }
        String passwordHash = passwordEncoder.encode(password);
        return accountRepository.save(new Account(username, passwordHash));
    }

    @Transactional(readOnly = true)
    public Optional<Account> authenticate(String username, String password) {
        return accountRepository.findByUsername(username)
                .filter(account -> passwordEncoder.matches(password, account.getPasswordHash()));
    }

    @Transactional(readOnly = true)
    public Optional<Account> findByUsername(String username) {
        return accountRepository.findByUsername(username);
    }

    @Transactional
    public String createApiKey(Account owner, String serverName) {
        String rawKey = UUID.randomUUID().toString();
        String keyHash = sha256(rawKey);
        apiKeyRepository.save(new ApiKey(keyHash, serverName, owner));
        return rawKey;
    }

    @Transactional(readOnly = true)
    public List<ApiKey> getApiKeys(Account owner) {
        return apiKeyRepository.findByOwner(owner);
    }

    @Transactional
    public boolean deleteApiKey(Account owner, UUID keyId) {
        return apiKeyRepository.findById(keyId)
                .filter(key -> key.getOwner() != null && key.getOwner().getId().equals(owner.getId()))
                .map(key -> {
                    apiKeyRepository.delete(key);
                    return true;
                })
                .orElse(false);
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
