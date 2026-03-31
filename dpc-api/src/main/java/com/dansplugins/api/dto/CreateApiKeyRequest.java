package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Request to create a new API key")
public record CreateApiKeyRequest(
        @NotBlank(message = "Server name is required")
        @Size(min = 1, max = 64, message = "Server name must be 1-64 characters")
        @Schema(description = "Name of the server this key is for (1-64 chars)", example = "survival-1")
        String serverName
) {
}
