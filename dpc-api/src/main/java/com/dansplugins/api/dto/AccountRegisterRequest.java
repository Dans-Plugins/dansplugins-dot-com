package com.dansplugins.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AccountRegisterRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 32, message = "Username must be 3-32 characters")
        @Pattern(regexp = "[a-zA-Z0-9_-]+", message = "Username may only contain letters, digits, hyphens, and underscores")
        String username,

        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 128, message = "Password must be 8-128 characters")
        String password
) {
}
