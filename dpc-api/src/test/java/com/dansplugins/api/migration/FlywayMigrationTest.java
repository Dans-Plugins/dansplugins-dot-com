package com.dansplugins.api.migration;

import com.dansplugins.api.entity.Faction;
import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.entity.PluginVersion;
import com.dansplugins.api.entity.PluginVersionAsset;
import com.dansplugins.api.repository.FactionRepository;
import com.dansplugins.api.repository.PluginRepository;
import com.dansplugins.api.repository.PluginVersionRepository;
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

import java.time.Instant;
import java.util.List;
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
        // This test does not use the "test" profile (see above), so both
        // scheduled GitHub syncs would otherwise be enabled by their production
        // defaults and could fire mid-test — calling the real API and writing
        // rows the assertions below do not expect.
        registry.add("dpc.backlog.sync-enabled", () -> "false");
        registry.add("dpc.releases.sync-enabled", () -> "false");
    }

    @Autowired
    private FactionRepository factionRepository;

    @Autowired
    private PluginRepository pluginRepository;

    @Autowired
    private PluginVersionRepository pluginVersionRepository;

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

    @Test
    void pluginCatalogueSeedApplies() {
        // V15 seeds the catalogue inline rather than leaving the table empty, so
        // this is where that SQL is actually executed — including the escaped
        // apostrophes in "Dan's Essentials", which a plain syntax check wouldn't
        // catch. The count is asserted loosely: the seed grows whenever a plugin
        // is added, and this test shouldn't have to be edited each time.
        assertThat(pluginRepository.count()).isGreaterThanOrEqualTo(16);

        Plugin flagship = pluginRepository.findBySlug("medieval-factions").orElseThrow();
        assertThat(flagship.getTitle()).isEqualTo("Medieval Factions");
        assertThat(flagship.getGithubUrl()).isEqualTo("https://github.com/Dans-Plugins/Medieval-Factions");
        assertThat(flagship.getCreatedAt()).isNotNull();

        assertThat(pluginRepository.findBySlug("dans-essentials").orElseThrow().getTitle())
                .isEqualTo("Dan's Essentials");

        // The catalogue file spells "no SpigotMC page" as ""; the table stores NULL.
        Plugin unpublished = pluginRepository.findBySlug("medieval-cookery").orElseThrow();
        assertThat(unpublished.getSpigotmcUrl()).isNull();
        assertThat(unpublished.getBstatsId()).isNull();
    }

    @Test
    void pluginVersionsRoundTripWithTheirAssets() {
        // V16's two tables are created empty, so this is the only place their
        // shape is exercised against real Postgres: the foreign key to plugins,
        // the (plugin, tag) uniqueness the sync upserts on, and the cascade from
        // a version to the assets it owns.
        Plugin plugin = pluginRepository.findBySlug("fiefs").orElseThrow();
        PluginVersion version = new PluginVersion(plugin, "v1.4.0");
        version.setName("Fiefs 1.4.0");
        version.setChangelog("### Added\n- Something");
        version.setHtmlUrl("https://github.com/Dans-Plugins/Fiefs/releases/tag/v1.4.0");
        version.setPublishedAt(Instant.parse("2026-01-02T03:04:05Z"));
        version.setLastSyncedAt(Instant.now());
        version.replaceAssets(List.of(new PluginVersionAsset("Fiefs-1.4.0.jar", 204800, 37,
                "https://github.com/Dans-Plugins/Fiefs/releases/download/v1.4.0/Fiefs-1.4.0.jar")));
        pluginVersionRepository.save(version);

        PluginVersion loaded = pluginVersionRepository.findByPluginAndTag(plugin, "v1.4.0").orElseThrow();
        assertThat(loaded.getName()).isEqualTo("Fiefs 1.4.0");
        assertThat(loaded.getPublishedAt()).isEqualTo(Instant.parse("2026-01-02T03:04:05Z"));
        assertThat(loaded.isPrerelease()).isFalse();
        assertThat(loaded.getAssets()).singleElement()
                .satisfies(asset -> {
                    assertThat(asset.getName()).isEqualTo("Fiefs-1.4.0.jar");
                    assertThat(asset.getSizeBytes()).isEqualTo(204800);
                    assertThat(asset.getDownloadCount()).isEqualTo(37);
                });
        assertThat(loaded.totalDownloadCount()).isEqualTo(37);

        pluginVersionRepository.deleteAll();
    }
}
