package com.dansplugins.api.dto;

import com.dansplugins.api.entity.Faction;

import java.time.Instant;
import java.util.UUID;

public record FactionResponse(
        UUID id,
        String name,
        String serverId,
        int memberCount,
        String description,
        String serverIp,
        String discordLink,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
    public static FactionResponse from(Faction faction) {
        return new FactionResponse(
                faction.getId(),
                faction.getName(),
                faction.getServerId(),
                faction.getMemberCount(),
                faction.getDescription(),
                faction.getServerIp(),
                faction.getDiscordLink(),
                faction.isActive(),
                faction.getCreatedAt(),
                faction.getUpdatedAt()
        );
    }
}
