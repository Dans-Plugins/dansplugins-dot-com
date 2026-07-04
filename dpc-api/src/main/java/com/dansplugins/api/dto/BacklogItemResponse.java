package com.dansplugins.api.dto;

import com.dansplugins.api.entity.BacklogItem;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "One open GitHub issue or pull request mirrored from the Dans-Plugins org")
public record BacklogItemResponse(
        String repo,
        int number,
        String targetId,
        String itemType,
        String title,
        boolean draft,
        String authorLogin,
        String htmlUrl,
        int commentCount,
        Instant githubCreatedAt,
        Instant githubUpdatedAt
) {
    public static BacklogItemResponse from(BacklogItem item) {
        return new BacklogItemResponse(
                item.getRepo(),
                item.getNumber(),
                item.targetId(),
                item.getItemType().name(),
                item.getTitle(),
                item.isDraft(),
                item.getAuthorLogin(),
                item.getHtmlUrl(),
                item.getCommentCount(),
                item.getGithubCreatedAt(),
                item.getGithubUpdatedAt()
        );
    }
}
