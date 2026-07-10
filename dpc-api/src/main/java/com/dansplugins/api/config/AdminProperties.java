package com.dansplugins.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/**
 * UserAuth usernames allowed to perform admin-only dev-portal actions —
 * currently just converting a feature request into a real GitHub issue.
 * Configured rather than hardcoded so it doesn't need a code change (or a
 * broader roles/permissions system) to add or remove an admin.
 */
@Validated
@ConfigurationProperties(prefix = "dpc.admin")
public record AdminProperties(
        List<String> usernames
) {
    public boolean isAdmin(String username) {
        return username != null && usernames != null && usernames.contains(username);
    }
}
