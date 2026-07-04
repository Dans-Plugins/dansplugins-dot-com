package com.dansplugins.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Configuration for converting a triaged {@link com.dansplugins.api.entity.FeatureRequest}
 * into a real GitHub issue. Needs a token with write access (unlike the
 * read-only backlog sync), since creating an issue is a GitHub write.
 */
@Validated
@ConfigurationProperties(prefix = "dpc.feature-requests")
public record FeatureRequestProperties(
        String githubToken
) {
}
