package com.dansplugins.api.dto;

import com.dansplugins.api.entity.ApiKey;
import com.dansplugins.api.entity.User;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Schema(description = "A user's community profile with their linked API keys")
public record ProfileResponse(
        @Schema(description = "Internal user UUID")
        UUID id,

        @Schema(description = "UserAuth username")
        String username,

        @Schema(description = "Display name (optional)")
        String displayName,

        @Schema(description = "Avatar URL (optional)")
        String avatarUrl,

        @Schema(description = "Bio (optional)")
        String bio,

        @Schema(description = "Profile creation timestamp")
        Instant createdAt,

        @Schema(description = "API keys owned by this user")
        List<ApiKeyInfo> apiKeys
) {

    @Schema(description = "Summary of an API key (hash not exposed)")
    public record ApiKeyInfo(
            UUID id,
            String keyPrefix,
            String serverName,
            Instant createdAt
    ) {
    }

    public static ProfileResponse from(User user, List<ApiKey> keys) {
        return new ProfileResponse(
                user.getId(),
                user.getUserauthUsername(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                user.getBio(),
                user.getCreatedAt(),
                keys.stream()
                        .map(k -> new ApiKeyInfo(k.getId(), k.getKeyPrefix(), k.getServerName(), k.getCreatedAt()))
                        .toList()
        );
    }
}
