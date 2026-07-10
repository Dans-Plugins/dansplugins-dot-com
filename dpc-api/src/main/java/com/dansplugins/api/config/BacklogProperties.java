package com.dansplugins.api.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Configuration for the dev-portal backlog sync (mirrors open GitHub issues/PRs
 * for one org into {@code backlog_items} so the /dev console has something to
 * read without calling GitHub on every page load).
 *
 * <p>{@code githubToken} is optional: without it the sync still runs against the
 * unauthenticated GitHub REST API, just at a much lower rate limit (10
 * requests/min for search, vs. 30 with a token). Set a classic PAT with no
 * scopes (public read access only needs an authenticated identity, not any
 * permission) via {@code DPC_BACKLOG_GITHUB_TOKEN} to raise the ceiling.</p>
 */
@Validated
@ConfigurationProperties(prefix = "dpc.backlog")
public record BacklogProperties(
        @NotBlank String org,
        String githubToken,
        @Positive long syncIntervalMs,
        boolean syncEnabled
) {
}
