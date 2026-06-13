package com.dansplugins.api.migration;

import com.dansplugins.api.entity.Faction;
import com.dansplugins.api.repository.FactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs the production Flyway migrations against a real Postgres (via
 * Testcontainers) and asserts that:
 * <ol>
 *     <li>every migration in {@code src/main/resources/db/migration/} applies
 *         cleanly to a fresh database,</li>
 *     <li>{@code hibernate.ddl-auto=validate} succeeds — meaning the schema
 *         produced by Flyway matches the JPA entity mappings,</li>
 *     <li>a basic write/read round-trip works against the migrated schema.</li>
 * </ol>
 *
 * <p>This is the safety net for "migration drift" — the failure mode where a
 * developer adds/changes an entity field but forgets the matching migration,
 * or vice versa. The standard test profile (see {@code application-test.yml})
 * disables Flyway and uses {@code create-drop} on H2, which does not parse
 * Postgres-specific types like {@code TIMESTAMPTZ}; it cannot catch drift.
 * This test is the one that does.
 *
 * <p>Does not use {@code @ActiveProfiles("test")} because that profile pins
 * the H2 dialect and disables Flyway — both of which this test needs to
 * override. Everything the test needs (JWT secret, Flyway settings, datasource
 * via {@code @ServiceConnection}) is supplied directly below.
 *
 * <p>Skipped automatically in environments without Docker (Testcontainers
 * cannot start its database). CI provides Docker by default.
 */
@SpringBootTest
@Testcontainers
@EnabledIf("dockerAvailable")
class FlywayMigrationTest {

    /** Used by {@code @EnabledIf} above. */
    static boolean dockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            return false;
        }
    }

    @Container
    @ServiceConnection
    @SuppressWarnings("resource")
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void supplyTestProperties(DynamicPropertyRegistry registry) {
        // Flyway on, validate the resulting schema against the JPA entities.
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        // Permissive safety guards so the round-trip below isn't blocked.
        registry.add("dpc.sync.safety.minimum-incoming-factions", () -> "1");
        registry.add("dpc.sync.safety.max-deactivation-ratio", () -> "1.0");
        registry.add("dpc.sync.safety.max-deactivations-per-sync", () -> "0");
    }

    @Autowired
    private FactionRepository factionRepository;

    @Test
    void migrationsApplyAndEntityShapeMatches() {
        // Reaching this assertion proves Flyway applied every V*.sql against
        // Postgres and Hibernate's validate step confirmed the schema matches
        // Faction's mappings. The round-trip additionally exercises the
        // NOT NULL constraint on V7's last_synced_at via @PrePersist.
        Faction faction = new Faction("Knights", "server-1", 5, "Desc", null, null);
        Faction saved = factionRepository.save(faction);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getLastSyncedAt()).isNotNull();
        assertThat(saved.isActive()).isTrue();

        UUID id = saved.getId();
        Faction loaded = factionRepository.findByIdAndActiveTrue(id).orElseThrow();
        assertThat(loaded.getName()).isEqualTo("Knights");
        assertThat(loaded.getServerId()).isEqualTo("server-1");
        assertThat(loaded.getMemberCount()).isEqualTo(5);
    }
}
