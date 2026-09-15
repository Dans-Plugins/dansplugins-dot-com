package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "A plugin's downloads through dansplugins.com, the way a SpigotMC resource page shows its own")
public record PluginDownloadsResponse(
        @Schema(description = "Every release summed, releases since withdrawn from GitHub included")
        long total,
        @Schema(description = "The release the catalogue labels as latest (newest stable, else newest pre-release); "
                + "null when nothing is mirrored", nullable = true)
        String latestTag,
        @Schema(description = "Downloads of that release; 0 when latestTag is null")
        long latest
) {
}
