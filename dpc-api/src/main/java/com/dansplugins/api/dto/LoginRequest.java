package com.dansplugins.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Username is required")
        @Size(max = 32, message = "Username must be at most 32 characters")
        String username,

        @NotBlank(message = "Password is required")
        @Size(max = 128, message = "Password must be at most 128 characters")
        String password
) {
}
