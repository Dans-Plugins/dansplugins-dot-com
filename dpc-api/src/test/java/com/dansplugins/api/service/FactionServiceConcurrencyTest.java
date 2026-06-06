package com.dansplugins.api.service;

import com.dansplugins.api.dto.FactionRequest;
import com.dansplugins.api.entity.Faction;
import com.dansplugins.api.repository.FactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Documents how concurrent syncs against the same {@code serverId} interact
 * with the safety guards, and verifies the recovery property.
 *
 * <p><b>Known race condition.</b> The guards in
 * {@link FactionService#applyDeactivationGuard} read "currently-active count"
 * inside a single transaction, but two transactions can each snapshot the
 * pre-state and pass their own ratio check independently. Under default
 * READ_COMMITTED isolation, neither sees the other's uncommitted upserts, so
 * a thread's UPDATE-then-upsert pattern does not protect against the other
 * thread's UPDATE happening between its own steps. Two concurrent disjoint
 * batches can leave some factions inactive that BOTH batches were touching.
 *
 * <p>In practice this only matters when:
 * <ul>
 *     <li>two MF servers share the same {@code serverId} (a configuration
 *         error — they should each have unique ids), or</li>
 *     <li>a single server's sync timer fires before the previous sync's HTTP
 *         response returns (extremely rare; Bukkit timers serialize).</li>
 * </ul>
 *
 * <p>The crucial safety property — <b>data is never permanently lost</b> — is
 * what this test pins down: any "lost" deactivation is just an
 * {@code active=false} flip on a soft-deleted row, and the next sync that
 * names that faction flips it back to active. Operators can always recover by
 * waiting one sync cycle or re-running their sync.
 *
 * <p>A future PR could close this race entirely with Postgres advisory locks
 * keyed by {@code serverId} hash, or {@code SERIALIZABLE} isolation with retry
 * on serialization failure. Both are out of scope for the initial integration.
 */
@SpringBootTest
@ActiveProfiles("test")
class FactionServiceConcurrencyTest {

    @Autowired
    private FactionService factionService;

    @Autowired
    private FactionRepository factionRepository;

    @BeforeEach
    void cleanDatabase() {
        factionRepository.deleteAll();
    }

    @Test
    void concurrentDisjointBatches_dataIsAlwaysRecoverable() throws Exception {
        // Seed 10 factions on the same server.
        for (int i = 0; i < 10; i++) {
            factionRepository.save(new Faction("F" + i, "shared-server", 1, null, null, null));
        }

        // Two batches that each upsert half of the factions and individually
        // would deactivate the other half (5/10 = 50% — at the ratio cap, not
        // exceeding it, so each is allowed).
        List<FactionRequest> batchA = List.of(
                req("F0"), req("F1"), req("F2"), req("F3"), req("F4")
        );
        List<FactionRequest> batchB = List.of(
                req("F5"), req("F6"), req("F7"), req("F8"), req("F9")
        );

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch fire = new CountDownLatch(1);
        try {
            pool.submit(() -> { ready.countDown(); fire.await(); factionService.syncFactions(batchA); return null; });
            pool.submit(() -> { ready.countDown(); fire.await(); factionService.syncFactions(batchB); return null; });

            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            fire.countDown();

            pool.shutdown();
            assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();
        } finally {
            if (!pool.isShutdown()) pool.shutdownNow();
        }

        // No row was hard-deleted by the race — all 10 are still in the table,
        // just possibly with the wrong active flag. This is the recoverability
        // invariant: nothing is permanently lost.
        assertThat(factionRepository.count()).isEqualTo(10);

        // After a single follow-up sync that names every faction, all 10 must
        // be active again. The race is self-healing.
        List<FactionRequest> recover = List.of(
                req("F0"), req("F1"), req("F2"), req("F3"), req("F4"),
                req("F5"), req("F6"), req("F7"), req("F8"), req("F9")
        );
        factionService.syncFactions(recover);

        for (int i = 0; i < 10; i++) {
            final int idx = i;
            Faction f = factionRepository.findAll().stream()
                    .filter(x -> x.getName().equals("F" + idx))
                    .findFirst().orElseThrow();
            assertThat(f.isActive())
                    .as("F%d should be reactivated by the follow-up sync", idx)
                    .isTrue();
        }
    }

    private FactionRequest req(String name) {
        return new FactionRequest(name, "shared-server", 1, null, null, null);
    }
}
