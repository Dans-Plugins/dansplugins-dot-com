package com.dansplugins.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FactionRequest(
        @NotBlank(message = "Faction name is required")
        @Size(min = 1, max = 64, message = "Faction name must be 1-64 characters")
        String name,

        @NotBlank(message = "Server identifier is required")
        @Size(min = 1, max = 64, message = "Server identifier must be 1-64 characters")
        String serverId,

        @NotNull(message = "Member count is required")
        @Min(value = 0, message = "Member count must be zero or positive")
        @Max(value = 100000, message = "Member count must not exceed 100000")
        Integer memberCount,

        @Size(max = 512, message = "Description must be at most 512 characters")
        String description,

        @Size(max = 253, message = "Server IP must be at most 253 characters")
        String serverIp,

        @Size(max = 512, message = "Discord link must be at most 512 characters")
        String discordLink
) {
}
