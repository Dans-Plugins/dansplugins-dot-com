package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "A target's like count after a like/unlike")
public record LikeCountResponse(
        String targetType,
        String targetId,
        long count
) {
}
