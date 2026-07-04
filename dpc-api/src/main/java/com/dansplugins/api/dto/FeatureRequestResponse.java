package com.dansplugins.api.dto;

import com.dansplugins.api.entity.FeatureRequest;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "A community-submitted plugin idea")
public record FeatureRequestResponse(
        String id,
        String repo,
        String title,
        String description,
        String authorUsername,
        String status,
        String convertedIssueUrl,
        Instant createdAt
) {
    public static FeatureRequestResponse from(FeatureRequest featureRequest) {
        return new FeatureRequestResponse(
                featureRequest.targetId(),
                featureRequest.getRepo(),
                featureRequest.getTitle(),
                featureRequest.getDescription(),
                featureRequest.getAuthor().getUserauthUsername(),
                featureRequest.getStatus().name(),
                featureRequest.getConvertedIssueUrl(),
                featureRequest.getCreatedAt()
        );
    }
}
