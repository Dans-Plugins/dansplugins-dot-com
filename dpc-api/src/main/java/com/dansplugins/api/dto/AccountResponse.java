package com.dansplugins.api.dto;

import com.dansplugins.api.entity.Account;
import com.dansplugins.api.entity.ApiKey;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Schema(description = "Account profile with linked API keys")
public record AccountResponse(
        @Schema(description = "Account UUID")
        UUID id,

        @Schema(description = "Account username")
        String username,

        @Schema(description = "Account creation timestamp")
        Instant createdAt,

        @Schema(description = "API keys linked to this account")
        List<ApiKeyInfo> apiKeys
) {

    @Schema(description = "Summary of an API key (hash not exposed)")
    public record ApiKeyInfo(
            @Schema(description = "API key UUID")
            UUID id,

            @Schema(description = "Key prefix for identification (first 8 chars)")
            String keyPrefix,

            @Schema(description = "Server name the key is associated with")
            String serverName,

            @Schema(description = "Key creation timestamp")
            Instant createdAt
    ) {
        public static ApiKeyInfo from(ApiKey key) {
            return new ApiKeyInfo(key.getId(), key.getKeyPrefix(), key.getServerName(), key.getCreatedAt());
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
