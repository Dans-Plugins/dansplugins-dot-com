package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * A news post exposed by {@code GET /api/v1/news}. The shape matches the
 * website's {@code NewsPost} model so the frontend can merge these posts
 * directly into its News feed.
 */
@Schema(description = "A community news post (currently sourced from Discord announcements)")
public record NewsPostResponse(
        @Schema(description = "Stable unique id, e.g. \"discord-<messageId>\"")
        String id,

        @Schema(description = "Post heading (derived from the first line of the announcement)")
        String title,

        @Schema(description = "Post date in YYYY-MM-DD (UTC)")
        String date,

        @Schema(description = "Full post body")
        String body,

        @Schema(description = "Provenance of the post, e.g. \"discord\"")
        String source,

        @Schema(description = "Link to the original source, or null")
        String sourceUrl,

        @Schema(description = "Author display name, or null")
        String author
) {
}
