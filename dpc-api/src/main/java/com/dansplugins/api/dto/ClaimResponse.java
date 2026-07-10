package com.dansplugins.api.dto;

import com.dansplugins.api.entity.Claim;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "An active claim on a backlog issue/PR")
public record ClaimResponse(
        String repo,
        int number,
        String targetId,
        String claimantUsername,
        Instant claimedAt
) {
    public static ClaimResponse from(Claim claim) {
        return new ClaimResponse(
                claim.getRepo(),
                claim.getNumber(),
                claim.targetId(),
                claim.getUser().getUserauthUsername(),
                claim.getClaimedAt()
        );
    }
}
