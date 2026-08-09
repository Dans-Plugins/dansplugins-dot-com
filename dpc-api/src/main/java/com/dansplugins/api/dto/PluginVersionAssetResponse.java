package com.dansplugins.api.dto;

import com.dansplugins.api.entity.PluginVersionAsset;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "One downloadable file attached to a release, hosted by GitHub")
public record PluginVersionAssetResponse(
        String name,
        long sizeBytes,
        int downloadCount,
        String downloadUrl
) {
    public static PluginVersionAssetResponse from(PluginVersionAsset asset) {
        return new PluginVersionAssetResponse(
                asset.getName(),
                asset.getSizeBytes(),
                asset.getDownloadCount(),
                asset.getDownloadUrl()
        );
    }
}
