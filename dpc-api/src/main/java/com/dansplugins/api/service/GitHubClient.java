package com.dansplugins.api.service;

import com.dansplugins.api.config.BacklogProperties;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Thin client for the parts of the GitHub REST API the backlog sync needs: the
 * Search API, scoped to open issues/PRs in one org. Read-only — nothing here
 * writes to GitHub (see GitHubIssueClient for that, used by feature-request
 * conversion).
 */
@Service
@Slf4j
public class GitHubClient {

    private static final String SEARCH_URL = "https://api.github.com/search/issues";
    private static final int PER_PAGE = 100;
    private static final int MAX_PAGES = 5;

    private final RestTemplate restTemplate;
    private final BacklogProperties properties;

    public GitHubClient(RestTemplateBuilder restTemplateBuilder, BacklogProperties properties) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(15))
                .build();
        this.properties = properties;
    }

    /**
     * All open issues (not PRs) in the configured org, across as many pages as
     * {@link #MAX_PAGES} allows.
     */
    public List<Map<String, Object>> openIssues() {
        return search("org:" + properties.org() + "+is:issue+is:open");
    }

    /** All open pull requests in the configured org. */
    public List<Map<String, Object>> openPullRequests() {
        return search("org:" + properties.org() + "+is:pr+is:open");
    }

    private List<Map<String, Object>> search(String query) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (int page = 1; page <= MAX_PAGES; page++) {
            String url = SEARCH_URL + "?q=" + query + "&per_page=" + PER_PAGE + "&page=" + page;
            List<Map<String, Object>> items = fetchPage(url);
            if (items.isEmpty()) {
                break;
            }
            results.addAll(items);
            if (items.size() < PER_PAGE) {
                break;
            }
        }
        return results;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchPage(String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/vnd.github+json");
        headers.set("User-Agent", "dpc-api-backlog-sync");
        if (properties.githubToken() != null && !properties.githubToken().isBlank()) {
            headers.setBearerAuth(properties.githubToken());
        }
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            Map<String, Object> body = response.getBody();
            if (body == null || body.get("items") == null) {
                return List.of();
            }
            return (List<Map<String, Object>>) body.get("items");
        } catch (RestClientException e) {
            log.warn("GitHub search request failed for {}: {}", url, e.getMessage());
            return List.of();
        }
    }
}
