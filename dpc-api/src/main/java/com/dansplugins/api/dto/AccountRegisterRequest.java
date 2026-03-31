package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Account registration request")
public record AccountRegisterRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 32, message = "Username must be 3-32 characters")
        @Pattern(regexp = "[a-zA-Z0-9_-]+", message = "Username may only contain letters, digits, hyphens, and underscores")
        @Schema(description = "Username (3-32 chars, alphanumeric + underscore/hyphen)", example = "player_one")
        String username,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 128, message = "Password must be 8-128 characters")
        @Schema(description = "Password (8-128 chars)", example = "securePass123")
        String password
) {
}
