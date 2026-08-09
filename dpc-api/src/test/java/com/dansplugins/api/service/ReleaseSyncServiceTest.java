package com.dansplugins.api.service;

import com.dansplugins.api.config.ReleaseSyncProperties;
import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.entity.PluginVersion;
import com.dansplugins.api.entity.PluginVersionAsset;
import com.dansplugins.api.repository.PluginRepository;
import com.dansplugins.api.repository.PluginVersionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReleaseSyncServiceTest {

    private static final int MAX_RELEASES = 3;

    @Mock
    private GitHubReleaseClient gitHubReleaseClient;

    @Mock
    private PluginRepository pluginRepository;

    @Mock
    private PluginVersionRepository pluginVersionRepository;

    private ReleaseSyncService service;

    private static Plugin plugin(String slug, String githubUrl) {
        return new Plugin(slug, slug, "Description", githubUrl, null, null, null);
    }

    private static Map<String, Object> release(String tag, String publishedAt) {
        Map<String, Object> raw = new HashMap<>();
        raw.put("tag_name", tag);
        raw.put("name", tag + " release");
        raw.put("body", "### Changed\n- Something");
        raw.put("html_url", "https://github.com/Dans-Plugins/Fiefs/releases/tag/" + tag);
        raw.put("prerelease", false);
        raw.put("draft", false);
        raw.put("published_at", publishedAt);
        raw.put("assets", List.of(Map.of(
                "name", "Fiefs-" + tag + ".jar",
                "size", 1024,
                "download_count", 12,
                "browser_download_url",
                "https://github.com/Dans-Plugins/Fiefs/releases/download/" + tag + "/Fiefs.jar")));
        return raw;
    }

    private static PluginVersion existingVersion(Plugin plugin, String tag, String publishedAt) {
        PluginVersion version = new PluginVersion(plugin, tag);
        version.setHtmlUrl("https://github.com/Dans-Plugins/Fiefs/releases/tag/" + tag);
        version.setPublishedAt(Instant.parse(publishedAt));
        version.setLastSyncedAt(Instant.parse(publishedAt));
        return version;
    }

    /** Wires the service and makes save() return what it was given, as JPA does. */
    private void givenService(boolean syncEnabled) {
        service = new ReleaseSyncService(gitHubReleaseClient, pluginRepository, pluginVersionRepository,
                new ReleaseSyncProperties(null, 3600000, syncEnabled, MAX_RELEASES));
    }

    private void savesWhatItIsGiven() {
        when(pluginVersionRepository.save(any(PluginVersion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void sync_doesNothing_whenDisabled() {
        givenService(false);

        service.sync();

        verify(pluginRepository, never()).findAll();
        verify(gitHubReleaseClient, never()).releases(anyString(), anyInt());
    }

    @Test
    void sync_mirrorsAReleaseWithItsAssets() {
        givenService(true);
        Plugin fiefs = plugin("fiefs", "https://github.com/Dans-Plugins/Fiefs");
        when(pluginRepository.findAll()).thenReturn(List.of(fiefs));
        when(gitHubReleaseClient.releases("Dans-Plugins/Fiefs", MAX_RELEASES))
                .thenReturn(Optional.of(List.of(release("v1.4.0", "2026-01-02T03:04:05Z"))));
        when(pluginVersionRepository.findByPluginAndTag(fiefs, "v1.4.0")).thenReturn(Optional.empty());
        when(pluginVersionRepository.findByPluginOrderByPublishedAtDesc(fiefs)).thenReturn(List.of());
        savesWhatItIsGiven();

        service.sync();

        verify(pluginVersionRepository).save(argThatVersion(version ->
                version.getTag().equals("v1.4.0")
                        && version.getName().equals("v1.4.0 release")
                        && version.getChangelog().startsWith("### Changed")
                        && version.getPublishedAt().equals(Instant.parse("2026-01-02T03:04:05Z"))
                        && version.getAssets().size() == 1
                        && version.totalDownloadCount() == 12));
    }

    @Test
    void sync_updatesAnExistingVersion_ratherThanDuplicatingIt() {
        givenService(true);
        Plugin fiefs = plugin("fiefs", "https://github.com/Dans-Plugins/Fiefs");
        PluginVersion existing = existingVersion(fiefs, "v1.4.0", "2026-01-02T03:04:05Z");
        existing.replaceAssets(new ArrayList<>(List.of(
                new PluginVersionAsset("Fiefs-v1.4.0.jar", 1024, 5, "https://example.invalid/old.jar"))));
        when(pluginRepository.findAll()).thenReturn(List.of(fiefs));
        when(gitHubReleaseClient.releases("Dans-Plugins/Fiefs", MAX_RELEASES))
                .thenReturn(Optional.of(List.of(release("v1.4.0", "2026-01-02T03:04:05Z"))));
        when(pluginVersionRepository.findByPluginAndTag(fiefs, "v1.4.0")).thenReturn(Optional.of(existing));
        when(pluginVersionRepository.findByPluginOrderByPublishedAtDesc(fiefs)).thenReturn(List.of(existing));
        savesWhatItIsGiven();

        service.sync();

        // The download count is GitHub's, so a refreshed asset must overwrite the
        // mirrored one rather than accumulating a second row for the same file.
        assertThat(existing.getAssets()).singleElement()
                .satisfies(asset -> assertThat(asset.getDownloadCount()).isEqualTo(12));
        verify(pluginVersionRepository).save(existing);
    }

    @Test
    void sync_truncatesAChangelogTooLongForItsColumn() {
        givenService(true);
        Plugin fiefs = plugin("fiefs", "https://github.com/Dans-Plugins/Fiefs");
        Map<String, Object> huge = release("v1.4.0", "2026-01-02T03:04:05Z");
        huge.put("body", "x".repeat(PluginVersion.MAX_CHANGELOG_LENGTH + 500));
        when(pluginRepository.findAll()).thenReturn(List.of(fiefs));
        when(gitHubReleaseClient.releases("Dans-Plugins/Fiefs", MAX_RELEASES))
                .thenReturn(Optional.of(List.of(huge)));
        when(pluginVersionRepository.findByPluginAndTag(fiefs, "v1.4.0")).thenReturn(Optional.empty());
        when(pluginVersionRepository.findByPluginOrderByPublishedAtDesc(fiefs)).thenReturn(List.of());
        savesWhatItIsGiven();

        service.sync();

        // A release body long enough to overflow the column must cost the tail of
        // one changelog, not the whole sync to a constraint violation.
        verify(pluginVersionRepository).save(argThatVersion(version ->
                version.getChangelog().length() == PluginVersion.MAX_CHANGELOG_LENGTH));
    }

    @Test
    void sync_skipsDrafts() {
        givenService(true);
        Plugin fiefs = plugin("fiefs", "https://github.com/Dans-Plugins/Fiefs");
        Map<String, Object> draft = release("v2.0.0-draft", "2026-02-02T00:00:00Z");
        draft.put("draft", true);
        when(pluginRepository.findAll()).thenReturn(List.of(fiefs));
        when(gitHubReleaseClient.releases("Dans-Plugins/Fiefs", MAX_RELEASES))
                .thenReturn(Optional.of(List.of(draft)));
        when(pluginVersionRepository.findByPluginOrderByPublishedAtDesc(fiefs)).thenReturn(List.of());

        service.sync();

        verify(pluginVersionRepository, never()).save(any(PluginVersion.class));
    }

    @Test
    void sync_skipsAMalformedRelease_withoutFailingTheRest() {
        givenService(true);
        Plugin fiefs = plugin("fiefs", "https://github.com/Dans-Plugins/Fiefs");
        Map<String, Object> malformed = new HashMap<>(release("v1.3.0", "2026-01-01T00:00:00Z"));
        malformed.remove("html_url");
        when(pluginRepository.findAll()).thenReturn(List.of(fiefs));
        when(gitHubReleaseClient.releases("Dans-Plugins/Fiefs", MAX_RELEASES))
                .thenReturn(Optional.of(List.of(malformed, release("v1.4.0", "2026-01-02T03:04:05Z"))));
        when(pluginVersionRepository.findByPluginAndTag(any(), anyString())).thenReturn(Optional.empty());
        when(pluginVersionRepository.findByPluginOrderByPublishedAtDesc(fiefs)).thenReturn(List.of());
        savesWhatItIsGiven();

        service.sync();

        verify(pluginVersionRepository).save(argThatVersion(version -> version.getTag().equals("v1.4.0")));
    }

    @Test
    void sync_deletesAWithdrawnRelease_whenTheWholeHistoryWasSeen() {
        givenService(true);
        Plugin fiefs = plugin("fiefs", "https://github.com/Dans-Plugins/Fiefs");
        PluginVersion withdrawn = existingVersion(fiefs, "v0.9.0", "2025-01-01T00:00:00Z");
        when(pluginRepository.findAll()).thenReturn(List.of(fiefs));
        // One release back, against a cap of three: GitHub's answer is the whole
        // history, so anything else mirrored for this plugin is gone from GitHub.
        when(gitHubReleaseClient.releases("Dans-Plugins/Fiefs", MAX_RELEASES))
                .thenReturn(Optional.of(List.of(release("v1.4.0", "2026-01-02T03:04:05Z"))));
        when(pluginVersionRepository.findByPluginAndTag(fiefs, "v1.4.0")).thenReturn(Optional.empty());
        when(pluginVersionRepository.findByPluginOrderByPublishedAtDesc(fiefs)).thenReturn(List.of(withdrawn));
        savesWhatItIsGiven();

        service.sync();

        verify(pluginVersionRepository).deleteAll(List.of(withdrawn));
    }

    @Test
    void sync_keepsOlderReleasesBeyondTheFetchWindow() {
        givenService(true);
        Plugin fiefs = plugin("fiefs", "https://github.com/Dans-Plugins/Fiefs");
        PluginVersion olderThanTheWindow = existingVersion(fiefs, "v0.9.0", "2025-01-01T00:00:00Z");
        when(pluginRepository.findAll()).thenReturn(List.of(fiefs));
        // A full page means older releases exist that this fetch never saw, so a
        // mirrored version older than the page is absence of evidence, not a
        // withdrawal.
        when(gitHubReleaseClient.releases("Dans-Plugins/Fiefs", MAX_RELEASES)).thenReturn(Optional.of(List.of(
                release("v1.4.0", "2026-03-01T00:00:00Z"),
                release("v1.3.0", "2026-02-01T00:00:00Z"),
                release("v1.2.0", "2026-01-01T00:00:00Z"))));
        when(pluginVersionRepository.findByPluginAndTag(any(), anyString())).thenReturn(Optional.empty());
        when(pluginVersionRepository.findByPluginOrderByPublishedAtDesc(fiefs))
                .thenReturn(List.of(olderThanTheWindow));
        savesWhatItIsGiven();

        service.sync();

        verify(pluginVersionRepository, never()).deleteAll(any());
    }

    @Test
    void sync_leavesTheMirrorAlone_whenGitHubCannotBeReached() {
        givenService(true);
        Plugin fiefs = plugin("fiefs", "https://github.com/Dans-Plugins/Fiefs");
        when(pluginRepository.findAll()).thenReturn(List.of(fiefs));
        when(gitHubReleaseClient.releases("Dans-Plugins/Fiefs", MAX_RELEASES)).thenReturn(Optional.empty());

        service.sync();

        // An outage must not empty a page that was working a minute ago.
        verify(pluginVersionRepository, never()).deleteAll(any());
        verify(pluginVersionRepository, never()).save(any(PluginVersion.class));
    }

    @Test
    void sync_skipsAPluginWhoseUrlNamesNoRepository() {
        givenService(true);
        when(pluginRepository.findAll()).thenReturn(List.of(plugin("elsewhere", "https://example.invalid/plugin")));

        service.sync();

        verify(gitHubReleaseClient, never()).releases(anyString(), anyInt());
    }

    @Test
    void repoSlugFrom_readsTheOwnerAndRepositoryFromACatalogueUrl() {
        assertThat(ReleaseSyncService.repoSlugFrom("https://github.com/Dans-Plugins/Fiefs"))
                .contains("Dans-Plugins/Fiefs");
        assertThat(ReleaseSyncService.repoSlugFrom("https://github.com/Dans-Plugins/Fiefs.git"))
                .contains("Dans-Plugins/Fiefs");
        assertThat(ReleaseSyncService.repoSlugFrom("https://github.com/Dans-Plugins/Fiefs/releases"))
                .contains("Dans-Plugins/Fiefs");
        assertThat(ReleaseSyncService.repoSlugFrom("https://www.spigotmc.org/resources/fiefs.98559/")).isEmpty();
        assertThat(ReleaseSyncService.repoSlugFrom(null)).isEmpty();
    }

    private static PluginVersion argThatVersion(java.util.function.Predicate<PluginVersion> predicate) {
        return org.mockito.ArgumentMatchers.argThat(predicate::test);
    }
}
