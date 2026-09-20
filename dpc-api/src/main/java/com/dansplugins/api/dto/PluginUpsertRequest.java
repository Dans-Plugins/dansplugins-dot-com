package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * A catalogue entry as an admin writes it. The same body serves creation
 * ({@code POST /api/v1/plugins}, where {@code slug} is required) and
 * replacement ({@code PUT /api/v1/plugins/{slug}}, where the path names the
 * plugin and a {@code slug} in the body is ignored). Every field is replaced
 * on a PUT — the form sends the whole entry — so an absent optional field
 * clears it, spelled here as null; the site's old catalogue file spelled the
 * same absence as "", and both are normalised to null in the service.
 */
@Schema(description = "A catalogue entry, as an admin creates or replaces it")
public record PluginUpsertRequest(
        @Schema(description = "URL-safe id; required on create, ignored on update", example = "medieval-factions")
        @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$", message = "slug must be lower-case words joined by hyphens")
        @Size(max = 64)
        String slug,

        @NotBlank(message = "title is required")
        @Size(max = 100)
        String title,

        @NotBlank(message = "description is required")
        @Size(max = 500)
        String description,

        @NotBlank(message = "githubUrl is required")
        @Pattern(regexp = "^https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/?$",
                message = "githubUrl must be a GitHub repository URL")
        @Size(max = 512)
        String githubUrl,

        @Pattern(regexp = "^(https://www\\.spigotmc\\.org/resources/.+)?$", message = "spigotmcUrl must be a SpigotMC resource URL")
        @Size(max = 512)
        String spigotmcUrl,

        @Pattern(regexp = "^[0-9]*$", message = "bstatsId must be numeric")
        @Size(max = 32)
        String bstatsId,

        @Pattern(regexp = "^(/[A-Za-z0-9_./-]+)?$", message = "iconPath must be a site-relative path")
        @Size(max = 256)
        String iconPath,

        @Schema(description = "Short lower-case words; duplicates are dropped")
        @Size(max = 12)
        List<@Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$", message = "a tag must be lower-case words joined by hyphens")
                @Size(max = 32) String> tags
) {
}
