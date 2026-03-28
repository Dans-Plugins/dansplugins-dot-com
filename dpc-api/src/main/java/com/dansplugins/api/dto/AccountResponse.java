package com.dansplugins.api.dto;

import com.dansplugins.api.entity.Account;
import com.dansplugins.api.entity.ApiKey;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AccountResponse(
        UUID id,
        String username,
        Instant createdAt,
        List<ApiKeyInfo> apiKeys
) {

    public record ApiKeyInfo(
            UUID id,
            String serverName,
            Instant createdAt
    ) {
        public static ApiKeyInfo from(ApiKey key) {
            return new ApiKeyInfo(key.getId(), key.getServerName(), key.getCreatedAt());
        }
    }

    public static AccountResponse from(Account account, List<ApiKey> keys) {
        return new AccountResponse(
                account.getId(),
                account.getUsername(),
                account.getCreatedAt(),
                keys.stream().map(ApiKeyInfo::from).toList()
        );
    }
}
