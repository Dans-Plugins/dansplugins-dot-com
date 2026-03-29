package com.dansplugins.api.service;

import com.dansplugins.api.entity.Account;
import com.dansplugins.api.entity.ApiKey;
import com.dansplugins.api.repository.AccountRepository;
import com.dansplugins.api.repository.ApiKeyRepository;
import com.dansplugins.api.util.HashUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

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
    public ApiKey createApiKey(Account owner, String serverName) {
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawKey = "dpc_" + HexFormat.of().formatHex(randomBytes);
        String keyPrefix = rawKey.substring(0, 8);
        String keyHash = HashUtil.sha256(rawKey);
        ApiKey apiKey = new ApiKey(keyHash, keyPrefix, serverName, owner);
        apiKeyRepository.save(apiKey);
        apiKey.setRawKey(rawKey);
        return apiKey;
    }

    @Transactional(readOnly = true)
    public List<ApiKey> getApiKeys(Account owner) {
        return apiKeyRepository.findByOwner(owner);
    }

    @Transactional
    public boolean deleteApiKey(Account owner, UUID keyId) {
        return apiKeyRepository.findById(keyId)
                .filter(key -> key.getOwner().getId().equals(owner.getId()))
                .map(key -> {
                    apiKeyRepository.delete(key);
                    return true;
                })
                .orElse(false);
    }
}
