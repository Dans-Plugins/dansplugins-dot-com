package com.dansplugins.api.service;

import com.dansplugins.api.client.DiscordClient;
import com.dansplugins.api.config.DiscordProperties;
import com.dansplugins.api.dto.DiscordMessageDto;
import com.dansplugins.api.dto.NewsPostResponse;
import com.dansplugins.api.entity.DiscordAnnouncement;
import com.dansplugins.api.repository.DiscordAnnouncementRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DiscordAnnouncementServiceTest {

    @Mock
    private DiscordClient discordClient;

    @Mock
    private DiscordAnnouncementRepository repository;

    private DiscordAnnouncementService serviceWith(DiscordProperties properties) {
        return new DiscordAnnouncementService(properties, discordClient, repository);
    }

    private static DiscordProperties configured() {
        return new DiscordProperties(true, "bot-token", "1234567890", "999",
                20, "https://discord.com/api/v10", 300000L);
    }

    private static DiscordProperties disabled() {
        return new DiscordProperties(false, "", "", "",
                20, "https://discord.com/api/v10", 300000L);
    }

    private static DiscordMessageDto message(String id, String content) {
        return new DiscordMessageDto(id, content,
                OffsetDateTime.of(2026, 6, 1, 12, 0, 0, 0, ZoneOffset.UTC),
                new DiscordMessageDto.Author("dan", "Dan"));
    }

    @Test
    void syncAnnouncements_whenDisabled_isNoOpAndNeverCallsDiscord() {
        int upserted = serviceWith(disabled()).syncAnnouncements();

        assertThat(upserted).isZero();
        verifyNoInteractions(discordClient);
        verifyNoInteractions(repository);
    }

    @Test
    void syncAnnouncements_insertsNewMessages_andNeverDeletes() {
        when(discordClient.fetchAnnouncements()).thenReturn(List.of(
                message("100", "First announcement"),
                message("101", "Second announcement")
        ));
        when(repository.findByMessageId(any())).thenReturn(Optional.empty());

        int upserted = serviceWith(configured()).syncAnnouncements();

        assertThat(upserted).isEqualTo(2);
        verify(repository, times(2)).save(any(DiscordAnnouncement.class));
        // The ingestion path must never delete previously-ingested announcements.
        verify(repository, never()).delete(any());
        verify(repository, never()).deleteAll();
    }

    @Test
    void syncAnnouncements_updatesExistingMessageInPlace() {
        DiscordAnnouncement existing = new DiscordAnnouncement("100", "1234567890",
                "Old text", "dan", null, Instant.parse("2026-05-01T00:00:00Z"));

        when(discordClient.fetchAnnouncements()).thenReturn(List.of(message("100", "Edited text")));
        when(repository.findByMessageId("100")).thenReturn(Optional.of(existing));

        int upserted = serviceWith(configured()).syncAnnouncements();

        assertThat(upserted).isEqualTo(1);
        // Same entity is updated (not a new row) and its content reflects the edit.
        assertThat(existing.getContent()).isEqualTo("Edited text");
        verify(repository).save(existing);
        verify(repository, never()).delete(any());
    }

    @Test
    void syncAnnouncements_skipsMessagesWithBlankContent() {
        when(discordClient.fetchAnnouncements()).thenReturn(List.of(
                message("100", "Real content"),
                message("101", "   "),
                message("102", "")
        ));
        when(repository.findByMessageId("100")).thenReturn(Optional.empty());

        int upserted = serviceWith(configured()).syncAnnouncements();

        assertThat(upserted).isEqualTo(1);
        verify(repository, times(1)).save(any(DiscordAnnouncement.class));
    }

    @Test
    void getRecentAsNewsPosts_mapsEntityToNewsPostShape() {
        DiscordAnnouncement entity = new DiscordAnnouncement("12345", "1234567890",
                "Patch 1.2 is live\nDetails follow.", "Dan",
                "https://discord.com/channels/999/1234567890/12345",
                Instant.parse("2026-06-01T12:00:00Z"));

        when(repository.findAllByOrderByPostedAtDesc(any())).thenReturn(List.of(entity));

        List<NewsPostResponse> posts = serviceWith(configured()).getRecentAsNewsPosts();

        assertThat(posts).hasSize(1);
        NewsPostResponse post = posts.get(0);
        assertThat(post.id()).isEqualTo("discord-12345");
        assertThat(post.title()).isEqualTo("Patch 1.2 is live");
        assertThat(post.date()).isEqualTo("2026-06-01");
        assertThat(post.source()).isEqualTo("discord");
        assertThat(post.sourceUrl()).isEqualTo("https://discord.com/channels/999/1234567890/12345");
        assertThat(post.author()).isEqualTo("Dan");
    }

    @Test
    void deriveTitle_usesFirstNonEmptyLine() {
        assertThat(DiscordAnnouncementService.deriveTitle("\nHeadline\nbody")).isEqualTo("Headline");
    }

    @Test
    void deriveTitle_truncatesLongFirstLine() {
        String longLine = "x".repeat(200);
        String title = DiscordAnnouncementService.deriveTitle(longLine);
        assertThat(title).hasSize(DiscordAnnouncementService.MAX_TITLE_LENGTH);
        assertThat(title).endsWith("…");
    }

    @Test
    void deriveTitle_fallsBackForEmptyContent() {
        assertThat(DiscordAnnouncementService.deriveTitle("   ")).isEqualTo("Discord announcement");
    }
}
