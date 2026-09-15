package com.dansplugins.api.dto;

import com.dansplugins.api.entity.PluginVersion;
import com.dansplugins.api.entity.PluginVersionAsset;
import com.dansplugins.api.service.PluginDownloadService;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.Map;

@Schema(description = "The release a plugin's catalogue entry should be labelled with, and the file it installs")
public record PluginLatestVersionResponse(
        String slug,
        String tag,
        boolean prerelease,
        Instant publishedAt,
        @Schema(description = "The plugin jar of that release on GitHub; null when the release attaches no jar",
                nullable = true)
        String downloadUrl,
        @Schema(description = "This API's counting download link for that jar, relative to the API origin; "
                + "null when downloadUrl is", nullable = true)
        String downloadPath,
        @Schema(description = "Downloads of this release made through dansplugins.com")
        long siteDownloadCount,
        @Schema(description = "Downloads of every release of the plugin made through dansplugins.com, "
                + "releases since withdrawn from GitHub included")
        long totalSiteDownloadCount
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
     *
     * <p>The two site counts are the SpigotMC pair a card shows: this
     * release's downloads and the plugin's total, both taken from
     * {@code siteCountsByTag} (tag → downloads through the site).
     */
    public static PluginLatestVersionResponse from(PluginVersion version, Map<String, Long> siteCountsByTag) {
        String slug = version.getPlugin().getSlug();
        PluginVersionAsset jar = version.pluginJar().orElse(null);
        return new PluginLatestVersionResponse(
                slug,
                version.getTag(),
                version.isPrerelease(),
                version.getPublishedAt(),
                jar == null ? null : jar.getDownloadUrl(),
                jar == null ? null : PluginDownloadService.downloadPath(slug, version.getTag(), jar.getName()),
                siteCountsByTag == null ? 0 : siteCountsByTag.getOrDefault(version.getTag(), 0L),
                PluginDownloadService.sum(siteCountsByTag)
        );
    }
}
