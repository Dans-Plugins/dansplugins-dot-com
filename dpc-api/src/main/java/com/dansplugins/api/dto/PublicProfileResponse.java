package com.dansplugins.api.dto;

import com.dansplugins.api.entity.Like;
import com.dansplugins.api.entity.User;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

/**
 * A user's <em>public</em> community profile, safe to expose without
 * authentication. Deliberately omits the internal user UUID and the user's API
 * keys (both present on {@link ProfileResponse}); it carries only the fields any
 * visitor may see plus the plugins/guides the user has liked.
 */
@Schema(description = "A user's public community profile (no internal id or API keys)")
public record PublicProfileResponse(
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

        @Schema(description = "Badges this user has earned")
        List<Badge> badges,

        @Schema(description = "Plugins and guides this user has liked")
        List<LikedTarget> likes
) {

    @Schema(description = "A plugin or guide the user has liked")
    public record LikedTarget(String targetType, String targetId) {
    }

    public static PublicProfileResponse from(User user, List<Badge> badges, List<Like> likes) {
        return new PublicProfileResponse(
                user.getUserauthUsername(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                user.getBio(),
                user.getCreatedAt(),
                badges,
                likes.stream()
                        .map(like -> new LikedTarget(like.getTargetType(), like.getTargetId()))
                        .toList()
        );
    }
}
