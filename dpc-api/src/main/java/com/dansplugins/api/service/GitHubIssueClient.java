package com.dansplugins.api.service;

import com.dansplugins.api.config.FeatureRequestProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.Duration;
import java.util.Map;

/**
 * Creates real GitHub issues — the write counterpart to the read-only
 * {@link GitHubClient} used by the backlog sync. Used only by feature-request
 * conversion, so a missing/under-scoped token only breaks that one action
 * rather than the whole dev portal.
 */
@Service
@Slf4j
public class GitHubIssueClient {

    private final RestTemplate restTemplate;
    private final FeatureRequestProperties properties;

    public GitHubIssueClient(RestTemplateBuilder restTemplateBuilder, FeatureRequestProperties properties) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(15))
                .build();
        this.properties = properties;
    }

    /** Creates an issue on {@code Dans-Plugins/<repo>} and returns its html_url. */
    @SuppressWarnings("unchecked")
    public String createIssue(String repo, String title, String body) {
        if (properties.githubToken() == null || properties.githubToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Feature-request conversion isn't configured (no GitHub token)");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/vnd.github+json");
        headers.set("User-Agent", "dpc-api-feature-request-conversion");
        headers.setBearerAuth(properties.githubToken());
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(Map.of("title", title, "body", body), headers);

        String url = "https://api.github.com/repos/Dans-Plugins/" + repo + "/issues";
        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            Object htmlUrl = responseBody == null ? null : responseBody.get("html_url");
            if (htmlUrl == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GitHub did not return an issue URL");
            }
            return htmlUrl.toString();
        } catch (RestClientException e) {
            log.warn("Failed to create GitHub issue in {}: {}", repo, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to create the GitHub issue: " + e.getMessage());
        }
    }
}
