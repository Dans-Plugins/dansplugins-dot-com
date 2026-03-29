package com.dansplugins.api.dto;

import java.util.UUID;

public record CreateApiKeyResponse(
        UUID id,
        String apiKey,
        String keyPrefix,
        String serverName
) {
}
