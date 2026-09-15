package com.dansplugins.api.dto;

import com.dansplugins.api.entity.PluginVersion;
import com.dansplugins.api.entity.PluginVersionAsset;
import com.dansplugins.api.service.PluginDownloadService;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Schema(description = "One release of a plugin, mirrored from GitHub")
public record PluginVersionResponse(
        String tag,
        String name,
        String changelog,
        String htmlUrl,
        boolean prerelease,
        Instant publishedAt,
        @Schema(description = "GitHub's counters for the release's files summed: downloads from anywhere")
        long downloadCount,
        @Schema(description = "Downloads of the release's files made through dansplugins.com, summed")
        long siteDownloadCount,
        List<PluginVersionAssetResponse> assets
) {
    /**
     * {@code downloadCount} is the release's assets summed, served alongside the
     * per-asset figures so a client showing one number does not have to know how
     * many jars a release happens to attach. {@code siteDownloadCount} is the
     * same sum of the site's own counters, which are looked up by asset name in
     * {@code siteCountsByAsset} — a file the mirror no longer lists but which
     * was downloaded while it did still counts toward the release's figure.
     *
     * <p>The slug is passed in rather than read through {@code version.getPlugin()}:
     * the controller builds these outside a transaction, where that is a lazy
     * proxy it cannot initialise.
     */
    public static PluginVersionResponse from(String slug, PluginVersion version, Map<String, Long> siteCountsByAsset) {
        List<PluginVersionAssetResponse> assets = version.getAssets().stream()
                .map(asset -> PluginVersionAssetResponse.from(slug, version.getTag(), asset,
                        siteCountFor(siteCountsByAsset, asset)))
                .toList();
        return new PluginVersionResponse(
                version.getTag(),
                version.getName(),
                version.getChangelog(),
                version.getHtmlUrl(),
                version.isPrerelease(),
                version.getPublishedAt(),
                version.totalDownloadCount(),
                PluginDownloadService.sum(siteCountsByAsset),
                assets
        );
    }

    private static long siteCountFor(Map<String, Long> siteCountsByAsset, PluginVersionAsset asset) {
        if (siteCountsByAsset == null) {
            return 0;
        }
        return siteCountsByAsset.getOrDefault(asset.getName(), 0L);
    }
}
