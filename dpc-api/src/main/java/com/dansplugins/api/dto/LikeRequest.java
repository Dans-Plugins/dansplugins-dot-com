package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "A like target: a plugin or guide, keyed by the plugin id")
public record LikeRequest(
        @NotBlank(message = "targetType is required")
        @Schema(description = "'plugin' or 'guide'", example = "plugin")
        String targetType,

        @NotBlank(message = "targetId is required")
        @Size(max = 64)
        @Schema(description = "The plugin id from plugins.json", example = "medieval-factions")
        String targetId
) {
}
