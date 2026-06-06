package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.UUID;

@Schema(description = "Response after creating a new API key (raw key shown once)")
public record CreateApiKeyResponse(
        @Schema(description = "API key UUID")
        UUID id,

        @Schema(description = "Raw API key (shown once, store securely)")
        String apiKey,

        @Schema(description = "Key prefix for identification (first 8 chars)")
        String keyPrefix,

        @Schema(description = "Server name the key is associated with")
        String serverName
) {
}
