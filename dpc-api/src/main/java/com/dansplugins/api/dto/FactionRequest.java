package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Faction data for sync")
public record FactionRequest(
        @NotBlank(message = "Faction name is required")
        @Size(min = 1, max = 64, message = "Faction name must be 1-64 characters")
        @Schema(description = "Faction name (1-64 chars)", example = "Iron Guard")
        String name,

        @NotBlank(message = "Server identifier is required")
        @Size(min = 1, max = 64, message = "Server identifier must be 1-64 characters")
        @Schema(description = "Server identifier (1-64 chars)", example = "survival-1")
        String serverId,

        @NotNull(message = "Member count is required")
        @Min(value = 0, message = "Member count must be zero or positive")
        @Max(value = 100000, message = "Member count must not exceed 100000")
        @Schema(description = "Number of faction members (0-100000)", example = "42")
        Integer memberCount,

        @Size(max = 512, message = "Description must be at most 512 characters")
        @Schema(description = "Faction description (max 512 chars)", example = "A powerful faction on the server")
        String description,

        @Size(max = 253, message = "Server IP must be at most 253 characters")
        @Schema(description = "Server IP address (max 253 chars)", example = "play.example.com")
        String serverIp,

        @Size(max = 512, message = "Discord link must be at most 512 characters")
        @Schema(description = "Discord invite link (max 512 chars)", example = "https://discord.gg/example")
        String discordLink
) {
}
