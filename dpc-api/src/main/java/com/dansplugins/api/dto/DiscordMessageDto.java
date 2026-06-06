package com.dansplugins.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.OffsetDateTime;

/**
 * Subset of a Discord message object (from {@code GET /channels/{id}/messages})
 * that the News ingestion needs. Unknown fields are ignored so Discord can add
 * fields without breaking deserialization.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record DiscordMessageDto(
        String id,
        String content,
        OffsetDateTime timestamp,
        Author author
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Author(
            String username,
            @JsonProperty("global_name") String globalName
    ) {
        /** Preferred display name: the Discord display name if set, else the username. */
        public String displayName() {
            return globalName != null && !globalName.isBlank() ? globalName : username;
        }
    }
}
