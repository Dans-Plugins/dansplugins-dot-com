package com.dansplugins.api.controller;

import com.dansplugins.api.dto.BacklogItemResponse;
import com.dansplugins.api.dto.RepoSummaryResponse;
import com.dansplugins.api.service.BacklogQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read-only view of the dev-portal backlog console: open GitHub issues/PRs
 * mirrored from the Dans-Plugins org by BacklogSyncService. All public — the
 * data is already public on GitHub, this is just an aggregated view of it.
 */
@RestController
@RequestMapping("/api/v1/backlog")
@RequiredArgsConstructor
@Tag(name = "Backlog", description = "Cross-repo GitHub issue/PR backlog for the dev portal")
public class BacklogController {

    private final BacklogQueryService backlogQueryService;

    @GetMapping
    @Operation(summary = "Open issues/PRs, optionally filtered to one repo")
    public List<BacklogItemResponse> items(@RequestParam(value = "repo", required = false) String repo) {
        return backlogQueryService.openItems(repo);
    }

    @GetMapping("/summary")
    @Operation(summary = "Per-repo counts and oldest open item, sorted by backlog size")
    public List<RepoSummaryResponse> summary() {
        return backlogQueryService.summary();
    }
}
