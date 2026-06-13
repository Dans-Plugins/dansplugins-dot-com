package com.dansplugins.api.service;

import com.dansplugins.api.entity.ApiKey;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.repository.ApiKeyRepository;
import com.dansplugins.api.repository.UserRepository;
import com.dansplugins.api.util.HashUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Owns the local user mirror and the API keys belonging to a user. Authentication
 * itself is handled by UserAuth (see {@link UserAuthClient}); this service only
 * maps a validated UserAuth username to a local {@link User} row and manages the
 * community/profile state hung off it.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final ApiKeyRepository apiKeyRepository;

    /**
     * Resolve the local mirror for a validated UserAuth username, creating it on first sight.
     */
    @Transactional
    public User getOrCreate(String userauthUsername) {
        return userRepository.findByUserauthUsername(userauthUsername)
                .orElseGet(() -> userRepository.save(new User(userauthUsername)));
    }

    @Transactional
    public User updateProfile(User user, String displayName, String avatarUrl, String bio) {
        user.setDisplayName(displayName);
        user.setAvatarUrl(avatarUrl);
        user.setBio(bio);
        return userRepository.save(user);
    }

    @Transactional
    public ApiKey createApiKey(User owner, String serverName) {
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
    public List<ApiKey> getApiKeys(User owner) {
        return apiKeyRepository.findByOwner(owner);
    }

    @Transactional
    public boolean deleteApiKey(User owner, UUID keyId) {
        return apiKeyRepository.findById(keyId)
                .filter(key -> key.getOwner().getId().equals(owner.getId()))
                .map(key -> {
                    apiKeyRepository.delete(key);
                    return true;
                })
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public Optional<User> findByUsername(String userauthUsername) {
        return userRepository.findByUserauthUsername(userauthUsername);
    }
}
