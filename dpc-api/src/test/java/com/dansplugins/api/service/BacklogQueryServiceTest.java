package com.dansplugins.api.service;

import com.dansplugins.api.dto.RepoSummaryResponse;
import com.dansplugins.api.entity.BacklogItem;
import com.dansplugins.api.repository.BacklogItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BacklogQueryServiceTest {

    @Mock
    private BacklogItemRepository backlogItemRepository;

    private BacklogQueryService service;

    private static BacklogItem item(String repo, int number, BacklogItem.ItemType type, boolean draft, String createdAt) {
        BacklogItem item = new BacklogItem(repo, number, type);
        item.setDraft(draft);
        item.setGithubCreatedAt(Instant.parse(createdAt));
        item.setTitle("t");
        item.setHtmlUrl("https://github.com/Dans-Plugins/" + repo);
        return item;
    }

    @Test
    void summary_groupsByRepo_andCountsIssuesPrsAndDrafts() {
        service = new BacklogQueryService(backlogItemRepository);
        when(backlogItemRepository.findByStateOrderByGithubCreatedAtAsc(BacklogItem.State.OPEN)).thenReturn(List.of(
                item("Medieval-Factions", 1, BacklogItem.ItemType.ISSUE, false, "2024-01-01T00:00:00Z"),
                item("Medieval-Factions", 2, BacklogItem.ItemType.ISSUE, false, "2023-01-01T00:00:00Z"),
                item("Medieval-Factions", 3, BacklogItem.ItemType.PULL_REQUEST, true, "2025-01-01T00:00:00Z"),
                item("Fiefs", 1, BacklogItem.ItemType.PULL_REQUEST, false, "2024-11-22T00:00:00Z")
        ));

        List<RepoSummaryResponse> summary = service.summary();

        RepoSummaryResponse mf = summary.stream().filter(r -> r.repo().equals("Medieval-Factions")).findFirst().orElseThrow();
        assertThat(mf.openIssueCount()).isEqualTo(2);
        assertThat(mf.openPrCount()).isEqualTo(1);
        assertThat(mf.draftPrCount()).isEqualTo(1);
        assertThat(mf.oldestOpenItemAt()).isEqualTo(Instant.parse("2023-01-01T00:00:00Z"));

        RepoSummaryResponse fiefs = summary.stream().filter(r -> r.repo().equals("Fiefs")).findFirst().orElseThrow();
        assertThat(fiefs.openIssueCount()).isZero();
        assertThat(fiefs.openPrCount()).isEqualTo(1);

        // Biggest backlog first.
        assertThat(summary.get(0).repo()).isEqualTo("Medieval-Factions");
    }

    @Test
    void openItems_withRepoFilter_delegatesToScopedQuery() {
        service = new BacklogQueryService(backlogItemRepository);
        BacklogItem mfIssue = item("Medieval-Factions", 9, BacklogItem.ItemType.ISSUE, false, "2024-01-01T00:00:00Z");
        when(backlogItemRepository.findByRepoAndStateOrderByGithubCreatedAtAsc("Medieval-Factions", BacklogItem.State.OPEN))
                .thenReturn(List.of(mfIssue));

        var result = service.openItems("Medieval-Factions");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).targetId()).isEqualTo("Medieval-Factions#9");
    }
}
