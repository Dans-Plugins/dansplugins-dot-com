package com.dansplugins.api.dto;

import com.dansplugins.api.entity.PluginVersion;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "The release a plugin's catalogue entry should be labelled with")
public record PluginLatestVersionResponse(
        String slug,
        String tag,
        boolean prerelease,
        Instant publishedAt
) {
    /**
     * {@code prerelease} and {@code publishedAt} are served because the choice
     * this endpoint makes is otherwise invisible: a caller handed
     * {@code v2.0.0-rc1} cannot tell whether that is the plugin's latest stable
     * release or the pre-release fallback used when it has no stable one. The
     * assets are deliberately absent — a caller wanting files wants the full
     * {@code /versions} list, not a label.
     */
    public static PluginLatestVersionResponse from(PluginVersion version) {
        return new PluginLatestVersionResponse(
                version.getPlugin().getSlug(),
                version.getTag(),
                version.isPrerelease(),
                version.getPublishedAt()
        );
    }
}
