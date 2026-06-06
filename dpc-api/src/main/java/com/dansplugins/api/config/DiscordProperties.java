package com.dansplugins.api.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Configuration for ingesting announcements from the community Discord server's
 * announcements channel into the News feed.
 *
 * <p>The integration ships <b>disabled by default</b>: with {@code enabled=false}
 * (or a missing bot token / channel id) the poller is a no-op and no calls are
 * made to Discord. Enable it per-environment via the {@code DISCORD_*}
 * environment variables documented in the dpc-api README; defaults are supplied
 * in {@code application.yml}.</p>
 *
 * @param enabled                whether Discord ingestion is active
 * @param botToken               Discord bot token (server-only secret); the bot
 *                               must be in the guild with read access to the
 *                               announcements channel
 * @param announcementsChannelId numeric id of the announcements channel to read
 * @param guildId                numeric guild id, used only to build message
 *                               permalinks; when blank, posts have no sourceUrl
 * @param fetchLimit             how many recent messages to request per poll (1..100)
 * @param apiBaseUrl             Discord REST API base URL
 * @param pollIntervalMillis     delay between polls, in milliseconds
 */
@Validated
@ConfigurationProperties(prefix = "dpc.discord")
public record DiscordProperties(
        boolean enabled,
        String botToken,
        String announcementsChannelId,
        String guildId,
        @Min(1) @Max(100) int fetchLimit,
        String apiBaseUrl,
        @Min(1000) long pollIntervalMillis
) {
    /** True when the integration is switched on and the required credentials are present. */
    public boolean isConfigured() {
        return enabled
                && botToken != null && !botToken.isBlank()
                && announcementsChannelId != null && !announcementsChannelId.isBlank();
    }
}
