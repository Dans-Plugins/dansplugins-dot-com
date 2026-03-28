package com.dansplugins.api.dto;

import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(
        @NotBlank(message = "Server name is required")
        String serverName
) {
}
