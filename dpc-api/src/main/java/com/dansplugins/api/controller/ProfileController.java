package com.dansplugins.api.controller;

import com.dansplugins.api.dto.CreateApiKeyRequest;
import com.dansplugins.api.dto.CreateApiKeyResponse;
import com.dansplugins.api.dto.ProfileResponse;
import com.dansplugins.api.dto.PublicProfileResponse;
import com.dansplugins.api.dto.UpdateProfileRequest;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.exception.ResourceNotFoundException;
import com.dansplugins.api.service.BadgeService;
import com.dansplugins.api.service.LikeService;
import com.dansplugins.api.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.UUID;

/**
 * The authenticated user's community profile and API keys. The principal is a
 * UserAuth username (set by {@link com.dansplugins.api.filter.UserAuthFilter}),
 * resolved here to the local {@link User} mirror (created on first request).
 */
@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
@Validated
@Tag(name = "Profile", description = "Current user's profile and API key management")
public class ProfileController {

    private final UserService userService;
    private final LikeService likeService;
    private final BadgeService badgeService;

    @GetMapping("/me")
    @Operation(summary = "Get the current user's profile", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ProfileResponse> getProfile(Principal principal) {
        User user = currentUser(principal);
        return ResponseEntity.ok(ProfileResponse.from(user, userService.getApiKeys(user)));
    }

    @GetMapping("/{username}")
    @Operation(summary = "Get a user's public profile (no authentication required)")
    public ResponseEntity<PublicProfileResponse> getPublicProfile(@PathVariable String username) {
        // Public, read-only: resolve an existing mirror but never create one (unlike
        // /me), and return only the public projection — no internal id, no API keys.
        // The literal /me mapping above takes precedence, so it is never reachable here.
        User user = userService.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(PublicProfileResponse.from(
                user, badgeService.badgesFor(user), likeService.likedByUser(user)));
    }

    @PatchMapping("/me")
    @Operation(summary = "Update the current user's profile", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ProfileResponse> updateProfile(Principal principal,
                                                         @Valid @RequestBody UpdateProfileRequest request) {
        User user = currentUser(principal);
        userService.updateProfile(user, request.displayName(), request.avatarUrl(), request.bio());
        return ResponseEntity.ok(ProfileResponse.from(user, userService.getApiKeys(user)));
    }

    @PostMapping("/me/api-keys")
    @Operation(summary = "Create a new API key", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<CreateApiKeyResponse> createApiKey(Principal principal,
                                                            @Valid @RequestBody CreateApiKeyRequest request) {
        User user = currentUser(principal);
        var apiKey = userService.createApiKey(user, request.serverName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CreateApiKeyResponse(apiKey.getId(), apiKey.getRawKey(),
                        apiKey.getKeyPrefix(), apiKey.getServerName()));
    }

    @DeleteMapping("/me/api-keys/{keyId}")
    @Operation(summary = "Delete an API key", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Void> deleteApiKey(Principal principal, @PathVariable UUID keyId) {
        User user = currentUser(principal);
        if (!userService.deleteApiKey(user, keyId)) {
            throw new ResourceNotFoundException("API key not found");
        }
        return ResponseEntity.noContent().build();
    }

    private User currentUser(Principal principal) {
        return userService.getOrCreate(principal.getName());
    }
}
