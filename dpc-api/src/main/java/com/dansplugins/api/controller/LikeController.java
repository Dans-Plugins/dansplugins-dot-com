package com.dansplugins.api.controller;

import com.dansplugins.api.dto.LikeCountResponse;
import com.dansplugins.api.dto.LikeRequest;
import com.dansplugins.api.entity.User;
import com.dansplugins.api.service.LikeService;
import com.dansplugins.api.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * Likes on plugins and guides. Counts are public; liking/unliking and reading the
 * current user's liked set require a UserAuth token.
 */
@RestController
@RequestMapping("/api/v1/likes")
@RequiredArgsConstructor
@Validated
@Tag(name = "Likes", description = "Like plugins and guides")
public class LikeController {

    private final UserService userService;
    private final LikeService likeService;

    @PostMapping
    @Operation(summary = "Like a plugin or guide", security = @SecurityRequirement(name = "bearerAuth"))
    public LikeCountResponse like(Principal principal, @Valid @RequestBody LikeRequest request) {
        User user = userService.getOrCreate(principal.getName());
        long count = likeService.like(user, request.targetType(), request.targetId());
        return new LikeCountResponse(request.targetType(), request.targetId(), count);
    }

    @DeleteMapping
    @Operation(summary = "Unlike a plugin or guide", security = @SecurityRequirement(name = "bearerAuth"))
    public LikeCountResponse unlike(Principal principal, @Valid @RequestBody LikeRequest request) {
        User user = userService.getOrCreate(principal.getName());
        long count = likeService.unlike(user, request.targetType(), request.targetId());
        return new LikeCountResponse(request.targetType(), request.targetId(), count);
    }

    @GetMapping("/counts")
    @Operation(summary = "Public like counts for a target type (targetId -> count)")
    public Map<String, Long> counts(@RequestParam("type") String type) {
        return likeService.countsForType(type);
    }

    @GetMapping("/me")
    @Operation(summary = "The current user's liked targets", security = @SecurityRequirement(name = "bearerAuth"))
    public List<LikeRequest> myLikes(Principal principal) {
        User user = userService.getOrCreate(principal.getName());
        return likeService.likedByUser(user).stream()
                .map(like -> new LikeRequest(like.getTargetType(), like.getTargetId()))
                .toList();
    }
}
