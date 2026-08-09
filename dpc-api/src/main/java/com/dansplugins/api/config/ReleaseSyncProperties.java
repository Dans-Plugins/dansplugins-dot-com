package com.dansplugins.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Positive;

/**
 * Configuration for the release sync (mirrors each catalogue plugin's GitHub
 * releases into {@code plugin_versions} so resource pages can show version
 * history without calling GitHub per request).
 *
 * <p>{@code githubToken} is optional and defaults to the backlog sync's token:
 * both only read public data, so either needs an authenticated identity rather
 * than any particular scope. Without one the sync still runs, at the
 * unauthenticated rate limit of 60 requests/hour — which one pass over sixteen
 * plugins fits inside, but not with much room, so a token is worth setting.
 *
 * <p>{@code maxReleasesPerPlugin} caps how far back the mirror reaches. It also
 * decides when the sync is allowed to prune: see
 * {@link com.dansplugins.api.service.ReleaseSyncService}.
 */
@Validated
@ConfigurationProperties(prefix = "dpc.releases")
public record ReleaseSyncProperties(
        String githubToken,
        @Positive long syncIntervalMs,
        boolean syncEnabled,
        @Positive int maxReleasesPerPlugin
) {
}
