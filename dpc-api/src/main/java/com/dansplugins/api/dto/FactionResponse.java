package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

@Schema(description = "Faction details")
public record FactionResponse(
        @Schema(description = "Faction UUID")
        UUID id,

        @Schema(description = "Faction name")
        String name,

        @Schema(description = "Server identifier")
        String serverId,

        @Schema(description = "Number of faction members")
        int memberCount,

        @Schema(description = "Faction description")
        String description,

        @Schema(description = "Server IP address")
        String serverIp,

        @Schema(description = "Discord invite link")
        String discordLink,

        @Schema(description = "Whether the faction is active")
        boolean active,

        @Schema(description = "Timestamp when the faction was first synced")
        Instant createdAt,

        @Schema(description = "Timestamp of the last sync update")
        Instant updatedAt
) {
}
