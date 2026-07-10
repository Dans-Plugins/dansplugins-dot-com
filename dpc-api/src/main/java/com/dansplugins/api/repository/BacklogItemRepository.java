package com.dansplugins.api.repository;

import com.dansplugins.api.entity.BacklogItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BacklogItemRepository extends JpaRepository<BacklogItem, UUID> {

    Optional<BacklogItem> findByRepoAndNumber(String repo, int number);

    List<BacklogItem> findByStateOrderByGithubCreatedAtAsc(BacklogItem.State state);

    List<BacklogItem> findByRepoAndStateOrderByGithubCreatedAtAsc(String repo, BacklogItem.State state);

    /** Every row not touched by the sync in progress — these are no longer open on GitHub. */
    List<BacklogItem> findByStateAndLastSyncedAtBefore(BacklogItem.State state, java.time.Instant cutoff);
}
