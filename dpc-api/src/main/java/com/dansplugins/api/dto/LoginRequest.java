package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Login request")
public record LoginRequest(
        @NotBlank(message = "Username is required")
        @Size(max = 32, message = "Username must be at most 32 characters")
        @Schema(description = "Account username", example = "player_one")
        String username,

        @NotBlank(message = "Password is required")
        @Size(max = 128, message = "Password must be at most 128 characters")
        @Schema(description = "Account password", example = "securePass123")
        String password
) {
}
