package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "Request to update the current user's profile. All fields optional.")
public record UpdateProfileRequest(
        @Size(max = 50, message = "Display name must be at most 50 characters")
        @Schema(description = "Display name (optional)")
        String displayName,

        @Size(max = 512, message = "Avatar URL must be at most 512 characters")
        @Schema(description = "Avatar URL (optional)")
        String avatarUrl,

        @Size(max = 500, message = "Bio must be at most 500 characters")
        @Schema(description = "Bio (optional)")
        String bio
) {
}
