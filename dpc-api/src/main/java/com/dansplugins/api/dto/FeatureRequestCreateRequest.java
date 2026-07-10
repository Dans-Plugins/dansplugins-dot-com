package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "A new community-submitted plugin idea")
public record FeatureRequestCreateRequest(
        @NotBlank(message = "repo is required")
        @Schema(example = "Medieval-Factions")
        String repo,

        @NotBlank(message = "title is required")
        @Size(max = 200)
        String title,

        @NotBlank(message = "description is required")
        @Size(max = 4000)
        String description
) {
}
