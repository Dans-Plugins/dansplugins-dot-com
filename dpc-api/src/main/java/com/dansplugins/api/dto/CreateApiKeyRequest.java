package com.dansplugins.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateApiKeyRequest(
        @NotBlank(message = "Server name is required")
        @Size(min = 1, max = 64, message = "Server name must be 1-64 characters")
        String serverName
) {
}
