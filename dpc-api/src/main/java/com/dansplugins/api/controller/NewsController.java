package com.dansplugins.api.controller;

import com.dansplugins.api.dto.NewsPostResponse;
import com.dansplugins.api.service.DiscordAnnouncementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
@Tag(name = "News", description = "Community news posts surfaced on the website")
public class NewsController {

    private final DiscordAnnouncementService discordAnnouncementService;

    @GetMapping
    @Operation(
            summary = "List community news posts",
            description = "Returns recent community news posts (currently Discord announcements), "
                    + "newest-first. Public endpoint; the website merges these with its own posts."
    )
    @ApiResponse(responseCode = "200", description = "News posts retrieved successfully")
    public ResponseEntity<List<NewsPostResponse>> getNews() {
        return ResponseEntity.ok(discordAnnouncementService.getRecentAsNewsPosts());
    }
}
