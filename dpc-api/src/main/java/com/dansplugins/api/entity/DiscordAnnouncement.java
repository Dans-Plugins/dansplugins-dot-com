package com.dansplugins.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * An announcement ingested from the community Discord server's announcements
 * channel, surfaced as a post on the website's News page.
 *
 * <p>Rows are upserted by {@code messageId} (see {@code DiscordAnnouncementService}):
 * a message is inserted once and updated in place if it is edited on Discord.
 * The ingestion path never deletes rows.</p>
 */
@Entity
@Table(name = "discord_announcements", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"message_id"})
})
@Getter
@Setter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class DiscordAnnouncement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(lombok.AccessLevel.NONE)
    private UUID id;

    @Column(name = "message_id", nullable = false, length = 32)
    private String messageId;

    @Column(name = "channel_id", nullable = false, length = 32)
    private String channelId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(length = 255)
    private String author;

    @Column(name = "message_url", length = 512)
    private String messageUrl;

    @Column(name = "posted_at", nullable = false)
    private Instant postedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public DiscordAnnouncement(String messageId, String channelId, String content,
                               String author, String messageUrl, Instant postedAt) {
        this.messageId = messageId;
        this.channelId = channelId;
        this.content = content;
        this.author = author;
        this.messageUrl = messageUrl;
        this.postedAt = postedAt;
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
