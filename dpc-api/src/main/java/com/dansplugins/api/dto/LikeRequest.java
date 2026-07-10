package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "A like target: a plugin, guide, backlog issue/PR, or feature request")
public record LikeRequest(
        @NotBlank(message = "targetType is required")
        @Schema(description = "'plugin', 'guide', 'issue', or 'feature_request'", example = "plugin")
        String targetType,

        @NotBlank(message = "targetId is required")
        @Size(max = 64)
        @Schema(description = "The plugin id from plugins.json, 'repo#number' for an 'issue' target, "
                + "or the feature request's id for a 'feature_request' target",
                example = "medieval-factions")
        String targetId
) {
}
