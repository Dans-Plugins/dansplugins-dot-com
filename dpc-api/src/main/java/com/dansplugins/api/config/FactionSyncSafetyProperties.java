package com.dansplugins.api.config;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Safety thresholds that govern when {@code POST /api/v1/factions} is allowed
 * to soft-delete (mark inactive) factions that are missing from the incoming
 * sync batch.
 *
 * <p>These guards exist to ensure that a single malformed or partial sync — for
 * example, a Minecraft plugin briefly observing an empty faction list during
 * startup, a database reload, or a bug — cannot wipe a server's registered
 * factions in one shot. If the guard rejects deactivation, the upserts in the
 * batch still apply; the sync simply does not flip any other factions to
 * inactive. Subsequent syncs that converge on a normal-sized batch reactivate
 * the registry without operator intervention.</p>
 */
@Validated
@ConfigurationProperties(prefix = "dpc.sync.safety")
public record FactionSyncSafetyProperties(
        /*
         * Minimum number of factions that must be present in an incoming batch
         * for that batch to be eligible to deactivate factions on the same
         * serverId. A batch smaller than this floor never deactivates, even if
         * the server currently has fewer active factions than the floor — this
         * protects against the "transient empty list" failure mode.
         */
        @Min(0) int minimumIncomingFactions,

        /*
         * Maximum fraction (0..1) of currently-active factions that a single
         * sync may deactivate. If applying the incoming batch would deactivate
         * more than this fraction, the deactivation step is skipped and a
         * warning is logged; upserts in the batch still apply.
         */
        @DecimalMin("0.0") @DecimalMax("1.0") double maxDeactivationRatio,

        /*
         * Hard upper bound on the number of factions a single sync may
         * deactivate. Defends against a runaway sync that would deactivate
         * thousands of factions. {@code 0} disables this guard.
         */
        @Min(0) int maxDeactivationsPerSync
) {
    public FactionSyncSafetyProperties {
        if (minimumIncomingFactions <= 0) minimumIncomingFactions = 1;
        if (maxDeactivationRatio <= 0.0) maxDeactivationRatio = 0.5;
        if (maxDeactivationsPerSync <= 0) maxDeactivationsPerSync = 1000;
    }
}
