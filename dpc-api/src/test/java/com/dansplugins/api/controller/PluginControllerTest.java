package com.dansplugins.api.controller;

import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.entity.PluginVersion;
import com.dansplugins.api.entity.PluginVersionAsset;
import com.dansplugins.api.repository.PluginDownloadCountRepository;
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

import java.net.URI;
import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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

    @Autowired
    private PluginDownloadCountRepository pluginDownloadCountRepository;

    @BeforeEach
    void setUp() {
        // Versions and counters first: they reference the plugins deleted last.
        pluginDownloadCountRepository.deleteAll();
        pluginVersionRepository.deleteAll();
        pluginRepository.deleteAll();
        pluginRepository.save(new Plugin("wild-pets", "Wild Pets", "Tame any entity.",
                "https://github.com/Dans-Plugins/Wild-Pets",
                "https://www.spigotmc.org/resources/wild-pets.95800/", "12332", "/icons/wp.png"));
        // No SpigotMC page, no bStats project, no icon — the nullable columns.
        Plugin cookery = new Plugin("medieval-cookery", "Medieval Cookery", "Cooking recipes.",
                "https://github.com/Dans-Plugins/Medieval-Cookery", null, null, null);
        cookery.getTags().addAll(java.util.Set.of("roleplay", "medieval", "recipes"));
        pluginRepository.save(cookery);
    }

    @AfterEach
    void tearDown() {
        // The H2 DB is shared across @SpringBootTest classes; leave it as found.
        pluginDownloadCountRepository.deleteAll();
        pluginVersionRepository.deleteAll();
        pluginRepository.deleteAll();
    }

    private static final String WILD_PETS_1_0_0_DOWNLOAD =
            "/api/v1/plugins/wild-pets/versions/v1.0.0/assets/WildPets-1.0.0.jar/download";
    private static final String WILD_PETS_1_1_0_DOWNLOAD =
            "/api/v1/plugins/wild-pets/versions/v1.1.0/assets/WildPets-1.1.0.jar/download";

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

    /** One mirrored release carrying only the columns the latest-version tests read. */
    private void givenRelease(String slug, String tag, String publishedAt, boolean prerelease) {
        Plugin plugin = pluginRepository.findBySlug(slug).orElseThrow();
        PluginVersion version = new PluginVersion(plugin, tag);
        version.setHtmlUrl("https://github.com/Dans-Plugins/X/releases/tag/" + tag);
        version.setPrerelease(prerelease);
        version.setPublishedAt(Instant.parse(publishedAt));
        version.setLastSyncedAt(Instant.parse("2026-03-01T00:00:00Z"));
        pluginVersionRepository.save(version);
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
                .andExpect(jsonPath("$.bstatsId").value("12332"))
                // Present and null until the release sync has recorded it, so
                // a client can tell "not yet known" from an older API.
                .andExpect(jsonPath("$.firstReleasedAt").value(nullValue()));
    }

    @Test
    void servesAPluginsTags_sorted_andAnEmptyListWhenUntagged() throws Exception {
        mockMvc.perform(get("/api/v1/plugins/medieval-cookery"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tags").value(org.hamcrest.Matchers.contains("medieval", "recipes", "roleplay")));
        mockMvc.perform(get("/api/v1/plugins/wild-pets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tags").isArray())
                .andExpect(jsonPath("$.tags").isEmpty());
    }

    @Test
    void servesTheFirstReleaseDate_onceTheSyncHasRecordedIt() throws Exception {
        Plugin wildPets = pluginRepository.findBySlug("wild-pets").orElseThrow();
        wildPets.setFirstReleasedAt(Instant.parse("2021-06-15T12:00:00Z"));
        pluginRepository.save(wildPets);

        mockMvc.perform(get("/api/v1/plugins/wild-pets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstReleasedAt").value("2021-06-15T12:00:00Z"));
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
    void namesEachPluginsLatestStableRelease() throws Exception {
        givenMirroredVersions();

        // Wild Pets' newest release, v1.1.0, is a pre-release; the label is the
        // newest stable one behind it, as GitHub's own /releases/latest means it.
        // Medieval Cookery has nothing mirrored, so the answer is one row rather
        // than two with a null tag: the caller asked which plugins have a release
        // to name, and "none" is an absence.
        mockMvc.perform(get("/api/v1/plugins/versions/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].slug").value("wild-pets"))
                .andExpect(jsonPath("$[0].tag").value("v1.0.0"))
                .andExpect(jsonPath("$[0].prerelease").value(false))
                .andExpect(jsonPath("$[0].publishedAt", startsWith("2026-01-01")))
                // The card's Download button: that release's jar, not the newer pre-release's.
                .andExpect(jsonPath("$[0].downloadUrl")
                        .value("https://github.com/Dans-Plugins/Wild-Pets/releases/download/v1.0.0/WildPets-1.0.0.jar"));
    }

    @Test
    void servesANullDownloadUrlWhenTheLatestReleaseAttachesNoJar() throws Exception {
        givenRelease("medieval-cookery", "v3.0.0", "2026-02-15T00:00:00Z", false);

        // A release with no files is still the one to label the card with; the
        // card just has nothing to offer for download. Asserted as an explicit
        // null so the key cannot quietly vanish from the documented shape.
        mockMvc.perform(get("/api/v1/plugins/versions/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tag").value("v3.0.0"))
                .andExpect(jsonPath("$[0].downloadUrl").value(nullValue()));
    }

    @Test
    void offersThePluginJarRatherThanASourcesJarThatSortsAheadOfIt() throws Exception {
        Plugin cookery = pluginRepository.findBySlug("medieval-cookery").orElseThrow();
        PluginVersion version = new PluginVersion(cookery, "v3.0.0");
        version.setHtmlUrl("https://github.com/Dans-Plugins/Medieval-Cookery/releases/tag/v3.0.0");
        version.setPublishedAt(Instant.parse("2026-02-15T00:00:00Z"));
        version.setLastSyncedAt(Instant.parse("2026-03-01T00:00:00Z"));
        // Assets are ordered by name, and '-' sorts before '.', so the sources
        // jar comes first — "first .jar" alone would hand the card the wrong file.
        version.replaceAssets(List.of(
                new PluginVersionAsset("MedievalCookery-3.0.0-sources.jar", 512, 0,
                        "https://github.com/Dans-Plugins/Medieval-Cookery/releases/download/v3.0.0/sources.jar"),
                new PluginVersionAsset("MedievalCookery-3.0.0.jar", 4096, 9,
                        "https://github.com/Dans-Plugins/Medieval-Cookery/releases/download/v3.0.0/MedievalCookery-3.0.0.jar")));
        pluginVersionRepository.save(version);

        mockMvc.perform(get("/api/v1/plugins/versions/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].downloadUrl")
                        .value("https://github.com/Dans-Plugins/Medieval-Cookery/releases/download/v3.0.0/MedievalCookery-3.0.0.jar"));
    }

    @Test
    void fallsBackToTheNewestPreReleaseWhenAPluginHasNoStableOne() throws Exception {
        givenRelease("medieval-cookery", "v0.1.0-beta", "2026-01-01T00:00:00Z", true);
        givenRelease("medieval-cookery", "v0.2.0-beta", "2026-02-01T00:00:00Z", true);

        // Dropping the plugin from the answer would be worse than labelling it
        // with a pre-release, so it is labelled — and says which it is.
        mockMvc.perform(get("/api/v1/plugins/versions/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].tag").value("v0.2.0-beta"))
                .andExpect(jsonPath("$[0].prerelease").value(true));
    }

    @Test
    void ordersTheLatestVersionsBySlug() throws Exception {
        givenMirroredVersions();
        givenRelease("medieval-cookery", "v3.0.0", "2026-02-15T00:00:00Z", false);

        mockMvc.perform(get("/api/v1/plugins/versions/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].slug").value("medieval-cookery"))
                .andExpect(jsonPath("$[1].slug").value("wild-pets"));
    }

    @Test
    void servesAnEmptyListWhenNothingIsMirroredAtAll() throws Exception {
        // Also the assertion that /versions/latest is routed to its own handler:
        // it and /{slug}/versions are both two segments, and being mistaken for
        // the latter would be a 404 for the plugin "versions" rather than a 200.
        mockMvc.perform(get("/api/v1/plugins/versions/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void isReadableWithoutAuthentication() throws Exception {
        // No Authorization header on any request above; asserted explicitly here
        // because the catalogue being public is a security-config decision, not
        // an accident of the controller.
        mockMvc.perform(get("/api/v1/plugins"))
                .andExpect(status().isOk());
    }

    // ---- downloads through the site ----

    @Test
    void downloadLinkCountsAndRedirectsToTheFileOnGitHub() throws Exception {
        givenMirroredVersions();

        // The browser is sent to GitHub; the bytes never pass through here. The
        // response is marked for crawlers and caches so a link checker's fetch
        // is as rare as possible and a cached redirect cannot skip the count.
        mockMvc.perform(get(WILD_PETS_1_0_0_DOWNLOAD))
                .andExpect(status().isFound())
                .andExpect(header().string("Location",
                        "https://github.com/Dans-Plugins/Wild-Pets/releases/download/v1.0.0/WildPets-1.0.0.jar"))
                .andExpect(header().string("X-Robots-Tag", "noindex, nofollow"))
                .andExpect(header().string("Cache-Control", "no-store"));
        mockMvc.perform(get(WILD_PETS_1_0_0_DOWNLOAD)).andExpect(status().isFound());

        mockMvc.perform(get("/api/v1/plugins/wild-pets/versions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[1].tag").value("v1.0.0"))
                .andExpect(jsonPath("$[1].siteDownloadCount").value(2))
                .andExpect(jsonPath("$[1].assets[0].siteDownloadCount").value(2))
                .andExpect(jsonPath("$[1].assets[0].downloadPath").value(WILD_PETS_1_0_0_DOWNLOAD))
                // GitHub's own figure is untouched: the two counters are different things.
                .andExpect(jsonPath("$[1].assets[0].downloadCount").value(40))
                .andExpect(jsonPath("$[1].downloadCount").value(40))
                .andExpect(jsonPath("$[0].siteDownloadCount").value(0));
    }

    @Test
    void aHeadRequestRedirectsButIsNotADownload() throws Exception {
        givenMirroredVersions();

        // Link checkers and browsers preflighting a link send HEAD; a visitor
        // fetching the file does not.
        mockMvc.perform(head(WILD_PETS_1_0_0_DOWNLOAD))
                .andExpect(status().isFound())
                .andExpect(header().exists("Location"));

        mockMvc.perform(get("/api/v1/plugins/wild-pets/downloads"))
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void downloadLinkIsNotFoundForAnythingTheMirrorDoesNotList() throws Exception {
        givenMirroredVersions();

        // The redirect target only ever comes from the mirror, so an address the
        // mirror does not know is a 404 rather than a guess at a GitHub URL.
        mockMvc.perform(get("/api/v1/plugins/not-a-plugin/versions/v1.0.0/assets/WildPets-1.0.0.jar/download"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/plugins/wild-pets/versions/v9.9.9/assets/WildPets-1.0.0.jar/download"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/plugins/wild-pets/versions/v1.0.0/assets/Other.jar/download"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/plugins/wild-pets/downloads"))
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void summarisesAPluginsDownloadsAsTotalAndLatest() throws Exception {
        givenMirroredVersions();
        mockMvc.perform(get(WILD_PETS_1_0_0_DOWNLOAD)).andExpect(status().isFound());
        mockMvc.perform(get(WILD_PETS_1_0_0_DOWNLOAD)).andExpect(status().isFound());
        mockMvc.perform(get(WILD_PETS_1_0_0_DOWNLOAD)).andExpect(status().isFound());
        mockMvc.perform(get(WILD_PETS_1_1_0_DOWNLOAD)).andExpect(status().isFound());

        // "Latest" is the release the catalogue labels as such — the newest
        // stable one, v1.0.0, not the newer pre-release — so the SpigotMC pair
        // reads 4 in total, 3 of the latest.
        mockMvc.perform(get("/api/v1/plugins/wild-pets/downloads"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(4))
                .andExpect(jsonPath("$.latestTag").value("v1.0.0"))
                .andExpect(jsonPath("$.latest").value(3));

        // And the catalogue row carries the same pair, plus the counting link.
        mockMvc.perform(get("/api/v1/plugins/versions/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].slug").value("wild-pets"))
                .andExpect(jsonPath("$[0].downloadPath").value(WILD_PETS_1_0_0_DOWNLOAD))
                .andExpect(jsonPath("$[0].siteDownloadCount").value(3))
                .andExpect(jsonPath("$[0].totalSiteDownloadCount").value(4));
    }

    @Test
    void summarisesAPluginWithNothingMirroredAsZeroes() throws Exception {
        mockMvc.perform(get("/api/v1/plugins/medieval-cookery/downloads"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.latestTag").value(nullValue()))
                .andExpect(jsonPath("$.latest").value(0));
        mockMvc.perform(get("/api/v1/plugins/not-a-plugin/downloads"))
                .andExpect(status().isNotFound());
    }

    @Test
    void downloadsSurviveTheSyncReplacingTheRelease() throws Exception {
        givenMirroredVersions();
        mockMvc.perform(get(WILD_PETS_1_0_0_DOWNLOAD)).andExpect(status().isFound());
        mockMvc.perform(get(WILD_PETS_1_1_0_DOWNLOAD)).andExpect(status().isFound());

        // The sync replaces asset rows on every run and deletes releases GitHub
        // withdraws. Neither may cost a plugin downloads that happened: the
        // counters are keyed by (plugin, tag, asset name), not by those rows.
        // Here v1.1.0 is withdrawn, and v1.0.0 is withdrawn and published again
        // — every mirrored row the downloads were made against is gone.
        Plugin wildPets = pluginRepository.findBySlug("wild-pets").orElseThrow();
        pluginVersionRepository.delete(pluginVersionRepository.findByPluginAndTag(wildPets, "v1.1.0").orElseThrow());
        pluginVersionRepository.delete(pluginVersionRepository.findByPluginAndTag(wildPets, "v1.0.0").orElseThrow());
        PluginVersion republished = new PluginVersion(wildPets, "v1.0.0");
        republished.setHtmlUrl("https://github.com/Dans-Plugins/Wild-Pets/releases/tag/v1.0.0");
        republished.setPublishedAt(Instant.parse("2026-01-01T00:00:00Z"));
        republished.setLastSyncedAt(Instant.parse("2026-04-01T00:00:00Z"));
        republished.replaceAssets(List.of(new PluginVersionAsset("WildPets-1.0.0.jar", 1024, 41,
                "https://github.com/Dans-Plugins/Wild-Pets/releases/download/v1.0.0/WildPets-1.0.0.jar")));
        pluginVersionRepository.save(republished);

        mockMvc.perform(get("/api/v1/plugins/wild-pets/downloads"))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.latest").value(1));
        mockMvc.perform(get("/api/v1/plugins/wild-pets/versions"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].siteDownloadCount").value(1));
        // The withdrawn release's file is no longer offered, so its link is gone too.
        mockMvc.perform(get(WILD_PETS_1_1_0_DOWNLOAD)).andExpect(status().isNotFound());
    }

    @Test
    void downloadPathEscapesWhatItIsBuiltFrom() throws Exception {
        Plugin cookery = pluginRepository.findBySlug("medieval-cookery").orElseThrow();
        PluginVersion version = new PluginVersion(cookery, "v3.0.0");
        version.setHtmlUrl("https://github.com/Dans-Plugins/Medieval-Cookery/releases/tag/v3.0.0");
        version.setPublishedAt(Instant.parse("2026-02-15T00:00:00Z"));
        version.setLastSyncedAt(Instant.parse("2026-03-01T00:00:00Z"));
        version.replaceAssets(List.of(new PluginVersionAsset("Medieval Cookery 3.0.jar", 10, 0,
                "https://github.com/Dans-Plugins/Medieval-Cookery/releases/download/v3.0.0/Medieval.Cookery.3.0.jar")));
        pluginVersionRepository.save(version);

        // A GitHub asset name can hold a space; the served path is what a browser
        // can follow, and following it finds the same asset again. Performed as
        // a URI rather than a template so MockMvc does not encode the % again.
        String path = "/api/v1/plugins/medieval-cookery/versions/v3.0.0/assets/Medieval%20Cookery%203.0.jar/download";
        mockMvc.perform(get("/api/v1/plugins/versions/latest"))
                .andExpect(jsonPath("$[0].downloadPath").value(path));
        mockMvc.perform(get(URI.create(path)))
                .andExpect(status().isFound())
                .andExpect(header().string("Location",
                        "https://github.com/Dans-Plugins/Medieval-Cookery/releases/download/v3.0.0/Medieval.Cookery.3.0.jar"));
        mockMvc.perform(get("/api/v1/plugins/medieval-cookery/downloads"))
                .andExpect(jsonPath("$.latest").value(1));
    }
}
