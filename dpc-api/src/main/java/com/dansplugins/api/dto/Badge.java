package com.dansplugins.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * A badge a user can earn, shown on their public profile. Badges are
 * <em>derived</em> from existing state (see {@code BadgeService}) rather than
 * stored, so they stay correct automatically.
 */
@Schema(description = "A badge shown on a user's public profile")
public enum Badge {

    /** The user owns at least one API key — i.e. runs a server that syncs with DPC. */
    SERVER_OWNER
}
