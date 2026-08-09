package com.dansplugins.api.controller;

import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.entity.PluginVersion;
import com.dansplugins.api.entity.PluginVersionAsset;
import com.dansplugins.api.repository.PluginRepository;
import com.dansplugins.api.repository.PluginVersionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The test profile runs on H2 with Flyway disabled, so the V15 seed is absent
 * here and the rows are inserted by hand. The seed itself is exercised against
 * real Postgres by {@code FlywayMigrationTest}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PluginControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PluginRepository pluginRepository;

    @Autowired
    private PluginVersionRepository pluginVersionRepository;

    @BeforeEach
    void setUp() {
        // Versions first: they reference the plugins deleted on the next line.
        pluginVersionRepository.deleteAll();
        pluginRepository.deleteAll();
        pluginRepository.save(new Plugin("wild-pets", "Wild Pets", "Tame any entity.",
                "https://github.com/Dans-Plugins/Wild-Pets",
                "https://www.spigotmc.org/resources/wild-pets.95800/", "12332", "/icons/wp.png"));
        // No SpigotMC page, no bStats project, no icon — the nullable columns.
        pluginRepository.save(new Plugin("medieval-cookery", "Medieval Cookery", "Cooking recipes.",
                "https://github.com/Dans-Plugins/Medieval-Cookery", null, null, null));
    }

    @AfterEach
    void tearDown() {
        // The H2 DB is shared across @SpringBootTest classes; leave it as found.
        pluginVersionRepository.deleteAll();
        pluginRepository.deleteAll();
    }

    /** Two mirrored releases for Wild Pets, published a month apart. */
    private void givenMirroredVersions() {
        Plugin wildPets = pluginRepository.findBySlug("wild-pets").orElseThrow();

        PluginVersion older = new PluginVersion(wildPets, "v1.0.0");
        older.setName("Wild Pets 1.0.0");
        older.setChangelog("First release.");
        older.setHtmlUrl("https://github.com/Dans-Plugins/Wild-Pets/releases/tag/v1.0.0");
        older.setPublishedAt(Instant.parse("2026-01-01T00:00:00Z"));
        older.setLastSyncedAt(Instant.parse("2026-03-01T00:00:00Z"));
        older.replaceAssets(List.of(new PluginVersionAsset("WildPets-1.0.0.jar", 1024, 40,
                "https://github.com/Dans-Plugins/Wild-Pets/releases/download/v1.0.0/WildPets-1.0.0.jar")));
        pluginVersionRepository.save(older);

        PluginVersion newer = new PluginVersion(wildPets, "v1.1.0");
        newer.setHtmlUrl("https://github.com/Dans-Plugins/Wild-Pets/releases/tag/v1.1.0");
        newer.setPrerelease(true);
        newer.setPublishedAt(Instant.parse("2026-02-01T00:00:00Z"));
        newer.setLastSyncedAt(Instant.parse("2026-03-01T00:00:00Z"));
        newer.replaceAssets(List.of(
                new PluginVersionAsset("WildPets-1.1.0.jar", 2048, 2,
                        "https://github.com/Dans-Plugins/Wild-Pets/releases/download/v1.1.0/WildPets-1.1.0.jar"),
                new PluginVersionAsset("WildPets-1.1.0-sources.jar", 512, 1,
                        "https://github.com/Dans-Plugins/Wild-Pets/releases/download/v1.1.0/sources.jar")));
        pluginVersionRepository.save(newer);
    }

    @Test
    void listsCatalogueAlphabeticallyByTitle() throws Exception {
        mockMvc.perform(get("/api/v1/plugins"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].slug").value("medieval-cookery"))
                .andExpect(jsonPath("$[1].slug").value("wild-pets"));
    }

    @Test
    void listOmitsTheInternalId() throws Exception {
        mockMvc.perform(get("/api/v1/plugins"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").doesNotExist());
    }

    @Test
    void getsOnePluginBySlug() throws Exception {
        mockMvc.perform(get("/api/v1/plugins/wild-pets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Wild Pets"))
                .andExpect(jsonPath("$.githubUrl").value("https://github.com/Dans-Plugins/Wild-Pets"))
                .andExpect(jsonPath("$.bstatsId").value("12332"));
    }

    @Test
    void servesTheOptionalFieldsAsNullWhenAbsent() throws Exception {
        // Asserted as an explicit JSON null rather than with doesNotExist(), which
        // passes for an omitted key too and so would not notice the response
        // dropping these fields entirely — a different shape from the one
        // dpc-api/README.md documents.
        mockMvc.perform(get("/api/v1/plugins/medieval-cookery"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spigotmcUrl").value(nullValue()))
                .andExpect(jsonPath("$.bstatsId").value(nullValue()))
                .andExpect(jsonPath("$.iconPath").value(nullValue()));
    }

    @Test
    void returnsNotFoundForAnUnknownSlug() throws Exception {
        mockMvc.perform(get("/api/v1/plugins/not-a-plugin"))
                .andExpect(status().isNotFound());
    }

    @Test
    void listsVersionsNewestFirst() throws Exception {
        givenMirroredVersions();

        mockMvc.perform(get("/api/v1/plugins/wild-pets/versions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].tag").value("v1.1.0"))
                .andExpect(jsonPath("$[0].prerelease").value(true))
                .andExpect(jsonPath("$[1].tag").value("v1.0.0"))
                .andExpect(jsonPath("$[1].name").value("Wild Pets 1.0.0"))
                .andExpect(jsonPath("$[1].changelog").value("First release."));
    }

    @Test
    void sumsAssetDownloadsIntoAPerVersionCount() throws Exception {
        givenMirroredVersions();

        // Both figures are served: a card showing one number should not have to
        // know how many files a release happens to attach.
        mockMvc.perform(get("/api/v1/plugins/wild-pets/versions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].downloadCount").value(3))
                .andExpect(jsonPath("$[0].assets.length()").value(2))
                .andExpect(jsonPath("$[1].downloadCount").value(40))
                .andExpect(jsonPath("$[1].assets[0].name").value("WildPets-1.0.0.jar"))
                .andExpect(jsonPath("$[1].assets[0].sizeBytes").value(1024))
                .andExpect(jsonPath("$[1].assets[0].downloadUrl").value(
                        "https://github.com/Dans-Plugins/Wild-Pets/releases/download/v1.0.0/WildPets-1.0.0.jar"));
    }

    @Test
    void servesAnEmptyVersionListForAPluginWithNoMirroredReleases() throws Exception {
        // A plugin that publishes no releases is a 200 and an empty list, not a
        // 404: the plugin exists, and the resource page renders "no releases yet"
        // rather than treating the section as broken.
        mockMvc.perform(get("/api/v1/plugins/medieval-cookery/versions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void returnsNotFoundForVersionsOfAnUnknownSlug() throws Exception {
        mockMvc.perform(get("/api/v1/plugins/not-a-plugin/versions"))
                .andExpect(status().isNotFound());
    }

    @Test
    void isReadableWithoutAuthentication() throws Exception {
        // No Authorization header on any request above; asserted explicitly here
        // because the catalogue being public is a security-config decision, not
        // an accident of the controller.
        mockMvc.perform(get("/api/v1/plugins"))
                .andExpect(status().isOk());
    }
}
