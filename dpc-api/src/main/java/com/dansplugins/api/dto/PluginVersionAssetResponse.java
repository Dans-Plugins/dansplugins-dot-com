package com.dansplugins.api.dto;

import com.dansplugins.api.entity.PluginVersionAsset;
import com.dansplugins.api.service.PluginDownloadService;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "One downloadable file attached to a release, hosted by GitHub")
public record PluginVersionAssetResponse(
        String name,
        long sizeBytes,
        @Schema(description = "GitHub's counter: downloads of this file from anywhere, copied at sync time")
        int downloadCount,
        @Schema(description = "The file on GitHub")
        String downloadUrl,
        @Schema(description = "Downloads of this file made through dansplugins.com, i.e. via downloadPath")
        long siteDownloadCount,
        @Schema(description = "This API's counting download link for the file, relative to the API origin; "
                + "it records the download and redirects to downloadUrl")
        String downloadPath
) {
    public static PluginVersionAssetResponse from(String slug, String tag, PluginVersionAsset asset,
                                                  long siteDownloadCount) {
        return new PluginVersionAssetResponse(
                asset.getName(),
                asset.getSizeBytes(),
                asset.getDownloadCount(),
                asset.getDownloadUrl(),
                siteDownloadCount,
                PluginDownloadService.downloadPath(slug, tag, asset.getName())
        );
    }
}
