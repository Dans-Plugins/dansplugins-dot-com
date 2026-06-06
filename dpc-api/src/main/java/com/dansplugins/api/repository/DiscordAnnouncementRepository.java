package com.dansplugins.api.repository;

import com.dansplugins.api.entity.DiscordAnnouncement;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DiscordAnnouncementRepository extends JpaRepository<DiscordAnnouncement, UUID> {

    /** Look up an existing announcement by its Discord message id (the upsert key). */
    Optional<DiscordAnnouncement> findByMessageId(String messageId);

    /** Announcements newest-first, for the News feed. */
    List<DiscordAnnouncement> findAllByOrderByPostedAtDesc(Pageable pageable);
}
