package com.dansplugins.api.controller;

import com.dansplugins.api.dto.ClaimRequest;
import com.dansplugins.api.dto.ClaimResponse;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.service.ClaimService;
import com.dansplugins.api.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

/**
 * "I'm working on this" claims on backlog issues/PRs — see {@link ClaimService}
 * for why this is a dpc-api record rather than a native GitHub assignee.
 */
@RestController
@RequestMapping("/api/v1/claims")
@RequiredArgsConstructor
@Validated
@Tag(name = "Claims", description = "Self-claim backlog issues/PRs")
public class ClaimController {

    private final UserService userService;
    private final ClaimService claimService;

    @PostMapping
    @Operation(summary = "Claim a backlog item", security = @SecurityRequirement(name = "bearerAuth"))
    public ClaimResponse claim(Principal principal, @Valid @RequestBody ClaimRequest request) {
        User user = userService.getOrCreate(principal.getName());
        return ClaimResponse.from(claimService.claim(user, request.repo(), request.number()));
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Release your own claim", security = @SecurityRequirement(name = "bearerAuth"))
    public void release(Principal principal, @Valid @RequestBody ClaimRequest request) {
        User user = userService.getOrCreate(principal.getName());
        claimService.release(user, request.repo(), request.number());
    }

    @GetMapping("/active")
    @Operation(summary = "Every currently active claim, across all repos (public)")
    public List<ClaimResponse> active() {
        return claimService.activeClaims().stream().map(ClaimResponse::from).toList();
    }

    @GetMapping("/me")
    @Operation(summary = "The current user's active claims", security = @SecurityRequirement(name = "bearerAuth"))
    public List<ClaimResponse> mine(Principal principal) {
        User user = userService.getOrCreate(principal.getName());
        return claimService.myActiveClaims(user).stream().map(ClaimResponse::from).toList();
    }
}
