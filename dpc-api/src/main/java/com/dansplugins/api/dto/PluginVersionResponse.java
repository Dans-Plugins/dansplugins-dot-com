package com.dansplugins.api.dto;

import com.dansplugins.api.entity.PluginVersion;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

@Schema(description = "One release of a plugin, mirrored from GitHub")
public record PluginVersionResponse(
        String tag,
        String name,
        String changelog,
        String htmlUrl,
        boolean prerelease,
        Instant publishedAt,
        long downloadCount,
        List<PluginVersionAssetResponse> assets
) {
    /**
     * {@code downloadCount} is the release's assets summed, served alongside the
     * per-asset figures so a client showing one number does not have to know how
     * many jars a release happens to attach.
     */
    public static PluginVersionResponse from(PluginVersion version) {
        return new PluginVersionResponse(
                version.getTag(),
                version.getName(),
                version.getChangelog(),
                version.getHtmlUrl(),
                version.isPrerelease(),
                version.getPublishedAt(),
                version.totalDownloadCount(),
                version.getAssets().stream().map(PluginVersionAssetResponse::from).toList()
        );
    }
}
