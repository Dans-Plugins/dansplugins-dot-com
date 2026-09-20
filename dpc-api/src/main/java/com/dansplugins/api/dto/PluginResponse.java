package com.dansplugins.api.dto;

import com.dansplugins.api.entity.Plugin;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

@Schema(description = "A plugin in the DPC catalogue")
public record PluginResponse(
        String slug,
        String title,
        String description,
        String githubUrl,
        String spigotmcUrl,
        String bstatsId,
        String iconPath,
        @Schema(description = "When the plugin's first release was published on GitHub; null for a plugin "
                + "with no releases, and until the release sync has recorded it", nullable = true)
        Instant firstReleasedAt,
        @Schema(description = "What the plugin is for, as short lower-case words, sorted; empty when untagged")
        List<String> tags
) {
    /**
     * The internal UUID is deliberately absent: the slug is the public
     * identifier everything else (guide routes, like targets, resource pages)
     * keys off, and exposing a second id would invite clients to use it.
     */
    public static PluginResponse from(Plugin plugin) {
        return new PluginResponse(
                plugin.getSlug(),
                plugin.getTitle(),
                plugin.getDescription(),
                plugin.getGithubUrl(),
                plugin.getSpigotmcUrl(),
                plugin.getBstatsId(),
                plugin.getIconPath(),
                plugin.getFirstReleasedAt(),
                plugin.getTags().stream().sorted().toList()
        );
    }
}
