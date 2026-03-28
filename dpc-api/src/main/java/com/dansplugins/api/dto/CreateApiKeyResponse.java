package com.dansplugins.api.dto;

public record CreateApiKeyResponse(
        String apiKey,
        String serverName
) {
}
