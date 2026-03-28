package com.dansplugins.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record FactionRequest(
        @NotBlank(message = "Faction name is required")
        String name,

        @NotBlank(message = "Server identifier is required")
        String serverId,

        @NotNull(message = "Member count is required")
        @Min(value = 0, message = "Member count must be zero or positive")
        Integer memberCount,

        String description,

        String serverIp,

        String discordLink
) {
}
