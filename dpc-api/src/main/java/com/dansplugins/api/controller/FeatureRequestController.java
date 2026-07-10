package com.dansplugins.api.controller;

import com.dansplugins.api.dto.FeatureRequestCreateRequest;
import com.dansplugins.api.dto.FeatureRequestResponse;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.service.FeatureRequestService;
import com.dansplugins.api.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/**
 * Community-submitted plugin ideas, scoped to a repo. Listing is public;
 * submitting requires a UserAuth token; converting to a real GitHub issue is
 * admin-only (see {@link com.dansplugins.api.config.AdminProperties}).
 */
@RestController
@RequestMapping("/api/v1/feature-requests")
@RequiredArgsConstructor
@Tag(name = "Feature Requests", description = "Community-submitted plugin ideas")
public class FeatureRequestController {

    private final UserService userService;
    private final FeatureRequestService featureRequestService;

    @PostMapping
    @Operation(summary = "Submit a feature request", security = @SecurityRequirement(name = "bearerAuth"))
    public FeatureRequestResponse create(Principal principal, @Valid @RequestBody FeatureRequestCreateRequest request) {
        User author = userService.getOrCreate(principal.getName());
        return FeatureRequestResponse.from(
                featureRequestService.create(author, request.repo(), request.title(), request.description()));
    }

    @GetMapping
    @Operation(summary = "List feature requests, optionally filtered to one repo")
    public List<FeatureRequestResponse> list(@RequestParam(value = "repo", required = false) String repo) {
        return featureRequestService.list(repo).stream().map(FeatureRequestResponse::from).toList();
    }

    @PostMapping("/{id}/convert")
    @Operation(summary = "Convert a feature request into a real GitHub issue (admin-only)",
            security = @SecurityRequirement(name = "bearerAuth"))
    public FeatureRequestResponse convert(Principal principal, @PathVariable UUID id) {
        return FeatureRequestResponse.from(featureRequestService.convert(principal.getName(), id));
    }
}
