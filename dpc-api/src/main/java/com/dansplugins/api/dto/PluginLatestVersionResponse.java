package com.dansplugins.api.dto;

import com.dansplugins.api.entity.PluginVersion;
import com.dansplugins.api.entity.PluginVersionAsset;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "The release a plugin's catalogue entry should be labelled with, and the file it installs")
public record PluginLatestVersionResponse(
        String slug,
        String tag,
        boolean prerelease,
        Instant publishedAt,
        @Schema(description = "The plugin jar of that release on GitHub; null when the release attaches no jar",
                nullable = true)
        String downloadUrl
) {
    /**
     * {@code prerelease} and {@code publishedAt} are served because the choice
     * this endpoint makes is otherwise invisible: a caller handed
     * {@code v2.0.0-rc1} cannot tell whether that is the plugin's latest stable
     * release or the pre-release fallback used when it has no stable one.
     *
     * <p>{@code downloadUrl} is the one file a catalogue card offers — the
     * plugin jar, chosen by {@link PluginVersion#pluginJar()} — so that a
     * Download button on every card costs the same single request the labels
     * do. The full asset list is deliberately still absent: a caller wanting
     * every file of every release wants {@code /versions}, not a label.
     */
    public static PluginLatestVersionResponse from(PluginVersion version) {
        return new PluginLatestVersionResponse(
                version.getPlugin().getSlug(),
                version.getTag(),
                version.isPrerelease(),
                version.getPublishedAt(),
                version.pluginJar().map(PluginVersionAsset::getDownloadUrl).orElse(null)
        );
    }
}
