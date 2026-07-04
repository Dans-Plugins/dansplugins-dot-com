package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Per-repo backlog rollup: counts and the oldest still-open item")
public record RepoSummaryResponse(
        String repo,
        long openIssueCount,
        long openPrCount,
        long draftPrCount,
        Instant oldestOpenItemAt
) {
}
