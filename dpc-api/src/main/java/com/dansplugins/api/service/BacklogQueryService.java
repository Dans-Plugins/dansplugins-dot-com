package com.dansplugins.api.service;

import com.dansplugins.api.dto.BacklogItemResponse;
import com.dansplugins.api.dto.RepoSummaryResponse;
import com.dansplugins.api.entity.BacklogItem;
import com.dansplugins.api.repository.BacklogItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Read side of the backlog console: the flat open-item list and the per-repo
 * rollup shown on /dev. Kept separate from {@link BacklogSyncService}, which
 * owns writing to backlog_items.
 */
@Service
@RequiredArgsConstructor
public class BacklogQueryService {

    private final BacklogItemRepository backlogItemRepository;

    @Transactional(readOnly = true)
    public List<BacklogItemResponse> openItems(String repo) {
        List<BacklogItem> items = (repo == null || repo.isBlank())
                ? backlogItemRepository.findByStateOrderByGithubCreatedAtAsc(BacklogItem.State.OPEN)
                : backlogItemRepository.findByRepoAndStateOrderByGithubCreatedAtAsc(repo, BacklogItem.State.OPEN);
        return items.stream().map(BacklogItemResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<RepoSummaryResponse> summary() {
        List<BacklogItem> openItems = backlogItemRepository.findByStateOrderByGithubCreatedAtAsc(BacklogItem.State.OPEN);
        Map<String, List<BacklogItem>> byRepo = openItems.stream().collect(Collectors.groupingBy(BacklogItem::getRepo));

        return byRepo.entrySet().stream()
                .map(entry -> {
                    String repo = entry.getKey();
                    List<BacklogItem> items = entry.getValue();
                    long issues = items.stream().filter(i -> i.getItemType() == BacklogItem.ItemType.ISSUE).count();
                    List<BacklogItem> prs = items.stream()
                            .filter(i -> i.getItemType() == BacklogItem.ItemType.PULL_REQUEST).toList();
                    long draftPrs = prs.stream().filter(BacklogItem::isDraft).count();
                    var oldest = items.stream().min(Comparator.comparing(BacklogItem::getGithubCreatedAt));
                    return new RepoSummaryResponse(repo, issues, prs.size(), draftPrs,
                            oldest.map(BacklogItem::getGithubCreatedAt).orElse(null));
                })
                .sorted(Comparator.comparing((RepoSummaryResponse r) -> r.openIssueCount() + r.openPrCount()).reversed())
                .toList();
    }
}
