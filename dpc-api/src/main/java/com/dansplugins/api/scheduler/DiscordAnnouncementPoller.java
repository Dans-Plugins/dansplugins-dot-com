package com.dansplugins.api.scheduler;

import com.dansplugins.api.service.DiscordAnnouncementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodically polls Discord for new announcements. The poll cadence is the
 * {@code dpc.discord.poll-interval-millis} property; the service itself is a
 * no-op when the integration is disabled/unconfigured, so this runs harmlessly
 * even when Discord ingestion is off.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DiscordAnnouncementPoller {

    private final DiscordAnnouncementService discordAnnouncementService;

    @Scheduled(
            fixedDelayString = "${dpc.discord.poll-interval-millis}",
            initialDelayString = "${dpc.discord.initial-delay-millis:15000}"
    )
    public void poll() {
        try {
            discordAnnouncementService.syncAnnouncements();
        } catch (Exception e) {
            // Never let a poll failure kill the scheduler thread.
            log.warn("Discord announcement poll failed: {}", e.getMessage());
        }
    }
}
