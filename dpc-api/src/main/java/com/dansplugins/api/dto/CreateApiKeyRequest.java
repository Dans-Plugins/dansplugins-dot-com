package com.dansplugins.api.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateApiKeyRequest(
        @NotBlank(message = "Server name is required")
        String serverName
) {
}
