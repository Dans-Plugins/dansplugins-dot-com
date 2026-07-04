package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "A like target: a plugin, guide, or backlog issue/PR")
public record LikeRequest(
        @NotBlank(message = "targetType is required")
        @Schema(description = "'plugin', 'guide', or 'issue'", example = "plugin")
        String targetType,

        @NotBlank(message = "targetId is required")
        @Size(max = 64)
        @Schema(description = "The plugin id from plugins.json, or 'repo#number' for an 'issue' target",
                example = "medieval-factions")
        String targetId
) {
}
