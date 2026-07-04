package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

@Schema(description = "A backlog item to claim or release: 'I'm working on this'")
public record ClaimRequest(
        @NotBlank(message = "repo is required")
        @Schema(example = "Medieval-Factions")
        String repo,

        @Positive(message = "number must be positive")
        @Schema(example = "1947")
        int number
) {
}
