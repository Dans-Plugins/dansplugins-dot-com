package com.dansplugins.api.service;

import com.dansplugins.api.config.BacklogProperties;
import com.dansplugins.api.entity.BacklogItem;
import com.dansplugins.api.repository.BacklogItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BacklogSyncServiceTest {

    @Mock
    private GitHubClient gitHubClient;

    @Mock
    private BacklogItemRepository backlogItemRepository;

    private BacklogSyncService service;

    private static Map<String, Object> rawItem(String repo, int number, String title, boolean draft) {
        return Map.of(
                "repository_url", "https://api.github.com/repos/Dans-Plugins/" + repo,
                "number", number,
                "title", title,
                "draft", draft,
                "user", Map.of("login", "someone"),
                "html_url", "https://github.com/Dans-Plugins/" + repo + "/issues/" + number,
                "comments", 2,
                "created_at", "2025-01-01T00:00:00Z",
                "updated_at", "2025-06-01T00:00:00Z"
        );
    }

    @Test
    void sync_doesNothing_whenDisabled() {
        service = new BacklogSyncService(gitHubClient, backlogItemRepository,
                new BacklogProperties("Dans-Plugins", null, 900000, false));

        service.sync();

        verify(gitHubClient, org.mockito.Mockito.never()).openIssues();
        verify(gitHubClient, org.mockito.Mockito.never()).openPullRequests();
    }

    @Test
    void sync_upsertsNewIssueAsOpen() {
        service = new BacklogSyncService(gitHubClient, backlogItemRepository,
                new BacklogProperties("Dans-Plugins", null, 900000, true));
        when(gitHubClient.openIssues()).thenReturn(List.of(rawItem("Medieval-Factions", 42, "A bug", false)));
        when(gitHubClient.openPullRequests()).thenReturn(List.of());
        when(backlogItemRepository.findByRepoAndNumber("Medieval-Factions", 42)).thenReturn(Optional.empty());
        when(backlogItemRepository.findByStateAndLastSyncedAtBefore(any(), any())).thenReturn(List.of());

        service.sync();

        verify(backlogItemRepository).save(argThatItem(item ->
                item.getRepo().equals("Medieval-Factions")
                        && item.getNumber() == 42
                        && item.getTitle().equals("A bug")
                        && item.getState() == BacklogItem.State.OPEN
                        && item.getItemType() == BacklogItem.ItemType.ISSUE));
    }

    @Test
    void sync_updatesExistingItem_ratherThanDuplicating() {
        service = new BacklogSyncService(gitHubClient, backlogItemRepository,
                new BacklogProperties("Dans-Plugins", null, 900000, true));
        BacklogItem existing = new BacklogItem("SimpleSkills", 7, BacklogItem.ItemType.ISSUE);
        when(gitHubClient.openIssues()).thenReturn(List.of(rawItem("SimpleSkills", 7, "Updated title", false)));
        when(gitHubClient.openPullRequests()).thenReturn(List.of());
        when(backlogItemRepository.findByRepoAndNumber("SimpleSkills", 7)).thenReturn(Optional.of(existing));
        when(backlogItemRepository.findByStateAndLastSyncedAtBefore(any(), any())).thenReturn(List.of());

        service.sync();

        assertThat(existing.getTitle()).isEqualTo("Updated title");
        verify(backlogItemRepository, times(1)).save(existing);
    }

    @Test
    void sync_closesItemsNoLongerSeenAsOpen() {
        service = new BacklogSyncService(gitHubClient, backlogItemRepository,
                new BacklogProperties("Dans-Plugins", null, 900000, true));
        when(gitHubClient.openIssues()).thenReturn(List.of());
        when(gitHubClient.openPullRequests()).thenReturn(List.of());
        BacklogItem stale = new BacklogItem("Fiefs", 1, BacklogItem.ItemType.ISSUE);
        stale.setState(BacklogItem.State.OPEN);
        when(backlogItemRepository.findByStateAndLastSyncedAtBefore(eq(BacklogItem.State.OPEN), any()))
                .thenReturn(List.of(stale));

        service.sync();

        assertThat(stale.getState()).isEqualTo(BacklogItem.State.CLOSED);
        verify(backlogItemRepository).saveAll(List.of(stale));
    }

    @Test
    void sync_skipsMalformedItem_withoutFailingTheWholeSync() {
        service = new BacklogSyncService(gitHubClient, backlogItemRepository,
                new BacklogProperties("Dans-Plugins", null, 900000, true));
        Map<String, Object> malformed = Map.of("repository_url", "https://api.github.com/repos/Dans-Plugins/X");
        Map<String, Object> good = rawItem("Fiefs", 5, "Fine", false);
        when(gitHubClient.openIssues()).thenReturn(List.of(malformed, good));
        when(gitHubClient.openPullRequests()).thenReturn(List.of());
        when(backlogItemRepository.findByRepoAndNumber("Fiefs", 5)).thenReturn(Optional.empty());
        when(backlogItemRepository.findByStateAndLastSyncedAtBefore(any(), any())).thenReturn(List.of());

        service.sync();

        verify(backlogItemRepository, times(1)).save(any(BacklogItem.class));
    }

    private static BacklogItem argThatItem(java.util.function.Predicate<BacklogItem> predicate) {
        return org.mockito.ArgumentMatchers.argThat(predicate::test);
    }
}
