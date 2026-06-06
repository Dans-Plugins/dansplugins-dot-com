package com.dansplugins.api.client;

import com.dansplugins.api.config.DiscordProperties;
import com.dansplugins.api.dto.DiscordMessageDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Arrays;
import java.util.List;

/**
 * Thin client over the Discord REST API for reading recent messages from the
 * announcements channel. Failures are swallowed (logged, empty list returned)
 * so a Discord outage never propagates into the News page or the poller.
 */
@Component
@Slf4j
public class DiscordClient {

    private final DiscordProperties properties;
    private final RestClient restClient;

    public DiscordClient(DiscordProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
    }

    /**
     * Fetch the most recent messages from the configured announcements channel,
     * newest-first (Discord's default ordering). Returns an empty list on any
     * error or non-2xx response.
     */
    public List<DiscordMessageDto> fetchAnnouncements() {
        try {
            DiscordMessageDto[] messages = restClient.get()
                    .uri(properties.apiBaseUrl() + "/channels/{channelId}/messages?limit={limit}",
                            properties.announcementsChannelId(), properties.fetchLimit())
                    .header(HttpHeaders.AUTHORIZATION, "Bot " + properties.botToken())
                    .retrieve()
                    .body(DiscordMessageDto[].class);
            return messages == null ? List.of() : Arrays.asList(messages);
        } catch (RestClientException e) {
            log.warn("Failed to fetch Discord announcements: {}", e.getMessage());
            return List.of();
        }
    }
}
