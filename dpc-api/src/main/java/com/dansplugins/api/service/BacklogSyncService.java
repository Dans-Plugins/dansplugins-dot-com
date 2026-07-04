package com.dansplugins.api.service;

import com.dansplugins.api.config.BacklogProperties;
import com.dansplugins.api.entity.BacklogItem;
import com.dansplugins.api.repository.BacklogItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Mirrors open GitHub issues/PRs for the configured org into {@link BacklogItem}
 * rows, on a fixed schedule (dpc.backlog.sync-interval-ms). GitHub stays the
 * system of record: a row whose repo/number wasn't seen in the sync just
 * completed is flipped to CLOSED rather than deleted, so the /dev console never
 * drifts into showing something GitHub no longer considers open.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BacklogSyncService {

    private final GitHubClient gitHubClient;
    private final BacklogItemRepository backlogItemRepository;
    private final BacklogProperties backlogProperties;

    @Scheduled(fixedDelayString = "${dpc.backlog.sync-interval-ms:900000}",
            initialDelayString = "${dpc.backlog.sync-initial-delay-ms:5000}")
    @Transactional
    public void sync() {
        if (!backlogProperties.syncEnabled()) {
            return;
        }
        Instant syncStartedAt = Instant.now();
        int upserted = 0;
        upserted += upsertAll(gitHubClient.openIssues(), BacklogItem.ItemType.ISSUE, syncStartedAt);
        upserted += upsertAll(gitHubClient.openPullRequests(), BacklogItem.ItemType.PULL_REQUEST, syncStartedAt);

        List<BacklogItem> staleOpenItems =
                backlogItemRepository.findByStateAndLastSyncedAtBefore(BacklogItem.State.OPEN, syncStartedAt);
        for (BacklogItem item : staleOpenItems) {
            item.setState(BacklogItem.State.CLOSED);
        }
        backlogItemRepository.saveAll(staleOpenItems);

        log.info("Backlog sync: upserted {} open items, closed {} stale items", upserted, staleOpenItems.size());
    }

    @SuppressWarnings("unchecked")
    private int upsertAll(List<Map<String, Object>> rawItems, BacklogItem.ItemType itemType, Instant syncedAt) {
        int count = 0;
        for (Map<String, Object> raw : rawItems) {
            try {
                upsertOne(raw, itemType, syncedAt);
                count++;
            } catch (RuntimeException e) {
                log.warn("Skipping malformed backlog item {}: {}", raw.get("html_url"), e.getMessage());
            }
        }
        return count;
    }

    @SuppressWarnings("unchecked")
    private void upsertOne(Map<String, Object> raw, BacklogItem.ItemType itemType, Instant syncedAt) {
        String repo = repoFrom((String) raw.get("repository_url"));
        int number = (Integer) raw.get("number");

        BacklogItem item = backlogItemRepository.findByRepoAndNumber(repo, number)
                .orElseGet(() -> new BacklogItem(repo, number, itemType));

        item.setItemType(itemType);
        item.setTitle((String) raw.get("title"));
        item.setState(BacklogItem.State.OPEN);
        item.setDraft(Boolean.TRUE.equals(raw.get("draft")));
        Map<String, Object> user = (Map<String, Object>) raw.get("user");
        item.setAuthorLogin(user == null ? null : (String) user.get("login"));
        item.setHtmlUrl((String) raw.get("html_url"));
        Object comments = raw.get("comments");
        item.setCommentCount(comments == null ? 0 : (Integer) comments);
        item.setGithubCreatedAt(Instant.parse((String) raw.get("created_at")));
        item.setGithubUpdatedAt(Instant.parse((String) raw.get("updated_at")));
        item.setLastSyncedAt(syncedAt);

        backlogItemRepository.save(item);
    }

    private String repoFrom(String repositoryUrl) {
        if (repositoryUrl == null) {
            throw new IllegalArgumentException("missing repository_url");
        }
        String[] parts = repositoryUrl.split("/");
        return parts[parts.length - 1];
    }
}
