package com.dansplugins.api.service;

import com.dansplugins.api.config.ReleaseSyncProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Reads one repository's releases from the GitHub REST API — the counterpart to
 * {@link GitHubClient}, which reads issues and PRs across the whole org. Kept
 * separate because the two answer different questions on different schedules,
 * and because a rate limit hit while mirroring releases must not take the
 * dev-portal backlog down with it.
 *
 * <p>Read-only, and deliberately failure-tolerant: an unreachable or
 * rate-limited GitHub yields {@link Optional#empty()} rather than an exception,
 * which is what lets {@link ReleaseSyncService} tell "GitHub said this plugin
 * has no releases" apart from "GitHub did not answer" — the distinction that
 * decides whether an existing mirror may be pruned.
 */
@Service
@Slf4j
public class GitHubReleaseClient {

    private final RestTemplate restTemplate;
    private final ReleaseSyncProperties properties;

    public GitHubReleaseClient(RestTemplateBuilder restTemplateBuilder, ReleaseSyncProperties properties) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(15))
                .build();
        this.properties = properties;
    }

    /**
     * The most recent releases of {@code owner/repo}, newest first, as GitHub
     * returns them.
     *
     * @param repo  the {@code owner/repo} slug, e.g. {@code Dans-Plugins/Fiefs}
     * @param limit how many releases to ask for (GitHub caps a page at 100)
     * @return the release list, or empty if GitHub could not be reached
     */
    @SuppressWarnings("unchecked")
    public Optional<List<Map<String, Object>>> releases(String repo, int limit) {
        String url = "https://api.github.com/repos/" + repo + "/releases?per_page=" + Math.min(limit, 100);
        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/vnd.github+json");
        headers.set("User-Agent", "dpc-api-release-sync");
        if (properties.githubToken() != null && !properties.githubToken().isBlank()) {
            headers.setBearerAuth(properties.githubToken());
        }
        try {
            ResponseEntity<List> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), List.class);
            List<Map<String, Object>> body = response.getBody();
            // A repository with no releases answers 200 with [], which is an
            // answer — distinct from the empty Optional returned on failure.
            return Optional.of(body == null ? List.of() : body);
        } catch (RestClientException e) {
            log.warn("GitHub release request failed for {}: {}", repo, e.getMessage());
            return Optional.empty();
        }
    }
}
