package com.dansplugins.api.service;

import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.entity.PluginVersion;
import com.dansplugins.api.entity.PluginVersionAsset;
import com.dansplugins.api.repository.PluginRepository;
import com.dansplugins.api.repository.PluginVersionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * The sync against a real (H2) database, because its unit test cannot see how
 * Hibernate flushes. In production the second hourly pass — the first against
 * a non-empty mirror — failed on every release that still had its jar:
 * clear-and-re-add inserted the new asset row before deleting the old one, and
 * {@code uq_plugin_version_asset} refused the duplicate. The entity carries
 * that constraint, so H2 refuses it the same way.
 */
// The test profile disables the sync so the scheduler stays quiet across the
// suite; this class calls sync() itself, so the switch is turned back on and
// the initial delay pushed out of the way so the scheduler cannot race it.
@SpringBootTest(properties = {
        "dpc.releases.sync-enabled=true",
        "dpc.releases.sync-initial-delay-ms=3600000",
})
@ActiveProfiles("test")
class ReleaseSyncServiceDbTest {

    @Autowired
    private ReleaseSyncService service;

    @Autowired
    private PluginRepository pluginRepository;

    @Autowired
    private PluginVersionRepository pluginVersionRepository;

    @MockBean
    private GitHubReleaseClient gitHubReleaseClient;

    private Plugin fiefs;

    @BeforeEach
    void givenAPlugin() {
        pluginVersionRepository.deleteAll();
        pluginRepository.deleteAll();
        fiefs = pluginRepository.save(
                new Plugin("fiefs", "Fiefs", "Land ownership.", "https://github.com/Dans-Plugins/Fiefs", null, null, null));
    }

    @AfterEach
    void leaveTheSharedDbAsFound() {
        pluginVersionRepository.deleteAll();
        pluginRepository.deleteAll();
    }

    private static Map<String, Object> asset(String name, int downloads) {
        return Map.of(
                "name", name,
                "size", 1024,
                "download_count", downloads,
                "browser_download_url", "https://github.com/Dans-Plugins/Fiefs/releases/download/v1.4.0/" + name);
    }

    private static Map<String, Object> release(List<Map<String, Object>> assets) {
        return Map.of(
                "tag_name", "v1.4.0",
                "name", "Fiefs 1.4.0",
                "body", "Notes.",
                "html_url", "https://github.com/Dans-Plugins/Fiefs/releases/tag/v1.4.0",
                "prerelease", false,
                "draft", false,
                "published_at", "2026-01-02T03:04:05Z",
                "assets", assets);
    }

    private void gitHubReports(Map<String, Object> release) {
        when(gitHubReleaseClient.releases(eq("Dans-Plugins/Fiefs"), anyInt()))
                .thenReturn(Optional.of(List.of(release)));
    }

    private List<PluginVersionAsset> mirroredAssets() {
        List<PluginVersion> versions = pluginVersionRepository.findByPluginOrderByPublishedAtDesc(fiefs);
        assertThat(versions).hasSize(1);
        return versions.get(0).getAssets();
    }

    @Test
    void aSecondPassOverAnUnchangedReleaseKeepsItsAssetRow() {
        gitHubReports(release(List.of(asset("Fiefs-1.4.0.jar", 12))));
        service.sync();
        List<PluginVersionAsset> first = mirroredAssets();

        gitHubReports(release(List.of(asset("Fiefs-1.4.0.jar", 15))));
        service.sync();

        // Same row, refreshed figure — not a duplicate, and not a constraint error.
        List<PluginVersionAsset> second = mirroredAssets();
        assertThat(second).hasSize(1);
        assertThat(second.get(0).getId()).isEqualTo(first.get(0).getId());
        assertThat(second.get(0).getDownloadCount()).isEqualTo(15);
    }

    @Test
    void aSecondPassAddsNewFilesAndDropsWithdrawnOnes() {
        gitHubReports(release(List.of(asset("Fiefs-1.4.0.jar", 12), asset("Fiefs-1.4.0-sources.jar", 1))));
        service.sync();

        gitHubReports(release(List.of(asset("Fiefs-1.4.0.jar", 12), asset("Fiefs-1.4.0-javadoc.jar", 0))));
        service.sync();

        assertThat(mirroredAssets()).extracting(PluginVersionAsset::getName)
                .containsExactlyInAnyOrder("Fiefs-1.4.0.jar", "Fiefs-1.4.0-javadoc.jar");
    }
}
