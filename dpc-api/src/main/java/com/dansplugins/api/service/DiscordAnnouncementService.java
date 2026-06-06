package com.dansplugins.api.service;

import com.dansplugins.api.client.DiscordClient;
import com.dansplugins.api.config.DiscordProperties;
import com.dansplugins.api.dto.DiscordMessageDto;
import com.dansplugins.api.dto.NewsPostResponse;
import com.dansplugins.api.entity.DiscordAnnouncement;
import com.dansplugins.api.repository.DiscordAnnouncementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Ingests Discord announcements into the {@code discord_announcements} table and
 * exposes them as news posts.
 *
 * <p>Ingestion is a pure <b>upsert by message id</b>: each message is inserted
 * once and updated in place if it is later edited. The service <b>never deletes</b>
 * rows — mirroring the faction-sync safety ethos, a Discord outage or an empty
 * fetch can never wipe previously-ingested announcements. When the integration
 * is not {@link DiscordProperties#isConfigured() configured}, ingestion is a
 * no-op.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DiscordAnnouncementService {

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneOffset.UTC);

    /** Cap on the derived title length before it is truncated with an ellipsis. */
    static final int MAX_TITLE_LENGTH = 100;

    private final DiscordProperties properties;
    private final DiscordClient discordClient;
    private final DiscordAnnouncementRepository repository;

    /**
     * Poll Discord and upsert each non-empty message. Returns the number of
     * messages upserted (0 when the integration is disabled/unconfigured).
     */
    @Transactional
    public int syncAnnouncements() {
        if (!properties.isConfigured()) {
            log.debug("Discord ingestion is disabled or unconfigured; skipping sync.");
            return 0;
        }

        List<DiscordMessageDto> messages = discordClient.fetchAnnouncements();
        int upserted = 0;
        for (DiscordMessageDto message : messages) {
            if (message.id() == null || isBlank(message.content())) {
                // Skip messages with no usable text (e.g. embed- or attachment-only posts).
                continue;
            }
            upsert(message);
            upserted++;
        }
        if (upserted > 0) {
            log.info("Ingested {} Discord announcement(s) from channel {}.",
                    upserted, properties.announcementsChannelId());
        }
        return upserted;
    }

    /** Recent announcements as news posts, newest-first. */
    @Transactional(readOnly = true)
    public List<NewsPostResponse> getRecentAsNewsPosts() {
        return repository.findAllByOrderByPostedAtDesc(PageRequest.of(0, properties.fetchLimit()))
                .stream()
                .map(this::toNewsPost)
                .toList();
    }

    private void upsert(DiscordMessageDto message) {
        String author = message.author() != null ? message.author().displayName() : null;
        String messageUrl = buildMessageUrl(message.id());
        Instant postedAt = message.timestamp() != null ? message.timestamp().toInstant() : Instant.now();

        DiscordAnnouncement entity = repository.findByMessageId(message.id()).orElse(null);
        if (entity == null) {
            entity = new DiscordAnnouncement(message.id(), properties.announcementsChannelId(),
                    message.content(), author, messageUrl, postedAt);
        } else {
            // Update in place if the message was edited on Discord — never replace the row.
            entity.setContent(message.content());
            entity.setAuthor(author);
            entity.setMessageUrl(messageUrl);
            entity.setPostedAt(postedAt);
        }
        repository.save(entity);
    }

    private NewsPostResponse toNewsPost(DiscordAnnouncement announcement) {
        return new NewsPostResponse(
                "discord-" + announcement.getMessageId(),
                deriveTitle(announcement.getContent()),
                DATE_FORMAT.format(announcement.getPostedAt()),
                announcement.getContent(),
                "discord",
                announcement.getMessageUrl(),
                announcement.getAuthor()
        );
    }

    private String buildMessageUrl(String messageId) {
        if (properties.guildId() == null || properties.guildId().isBlank()) {
            return null;
        }
        return "https://discord.com/channels/%s/%s/%s"
                .formatted(properties.guildId(), properties.announcementsChannelId(), messageId);
    }

    /**
     * Derive a post title from a message body: the first non-empty line,
     * truncated to {@link #MAX_TITLE_LENGTH}. Pure/static for testability.
     */
    static String deriveTitle(String content) {
        if (content == null) {
            return "Discord announcement";
        }
        String firstLine = content.strip().lines()
                .map(String::strip)
                .filter(line -> !line.isEmpty())
                .findFirst()
                .orElse("");
        if (firstLine.isEmpty()) {
            return "Discord announcement";
        }
        if (firstLine.length() > MAX_TITLE_LENGTH) {
            return firstLine.substring(0, MAX_TITLE_LENGTH - 1).stripTrailing() + "…";
        }
        return firstLine;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
