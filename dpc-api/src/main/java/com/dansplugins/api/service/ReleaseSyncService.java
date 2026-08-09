package com.dansplugins.api.service;

import com.dansplugins.api.config.ReleaseSyncProperties;
import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.entity.PluginVersion;
import com.dansplugins.api.entity.PluginVersionAsset;
import com.dansplugins.api.repository.PluginRepository;
import com.dansplugins.api.repository.PluginVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Mirrors each catalogue plugin's GitHub releases into {@code plugin_versions}
 * and {@code plugin_version_assets}, on a fixed schedule
 * ({@code dpc.releases.sync-interval-ms}), in the same shape
 * {@link BacklogSyncService} uses for issues. Resource pages then render version
 * history from the mirror rather than calling GitHub on every request, which is
 * both faster and immune to the API rate limit that would otherwise show a
 * visitor nothing.
 *
 * <p>GitHub stays the system of record, so a release it no longer reports is
 * deleted here rather than kept. That deletion is deliberately conservative:
 *
 * <ul>
 *   <li>A plugin whose fetch <em>failed</em> is skipped whole. An outage or a
 *       rate limit must never empty a page that was working a minute ago.</li>
 *   <li>Only the newest {@code maxReleasesPerPlugin} releases are fetched, so a
 *       full page of results means older releases exist that were not seen.
 *       Pruning is then limited to versions at least as new as the oldest
 *       release in the response — everything the fetch actually had an opinion
 *       about. A short page means the whole history was seen and anything
 *       missing from it really is gone.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReleaseSyncService {

    private static final Pattern REPO_URL = Pattern.compile("github\\.com/([^/]+)/([^/#?]+)");

    private final GitHubReleaseClient gitHubReleaseClient;
    private final PluginRepository pluginRepository;
    private final PluginVersionRepository pluginVersionRepository;
    private final ReleaseSyncProperties properties;

    /**
     * The {@code owner/repo} slug in a repository URL, e.g.
     * {@code https://github.com/Dans-Plugins/Fiefs} to {@code Dans-Plugins/Fiefs}.
     * Mirrors {@code parseGithubRepo} in the website's {@code utils/github.ts},
     * so both sides resolve a catalogue entry to the same repository.
     *
     * @return the slug, or empty if the URL names no repository
     */
    public static Optional<String> repoSlugFrom(String githubUrl) {
        if (githubUrl == null) {
            return Optional.empty();
        }
        Matcher matcher = REPO_URL.matcher(githubUrl);
        if (!matcher.find()) {
            return Optional.empty();
        }
        return Optional.of(matcher.group(1) + "/" + matcher.group(2).replaceAll("\\.git$", ""));
    }

    @Scheduled(fixedDelayString = "${dpc.releases.sync-interval-ms:3600000}",
            initialDelayString = "${dpc.releases.sync-initial-delay-ms:15000}")
    @Transactional
    public void sync() {
        if (!properties.syncEnabled()) {
            return;
        }
        int mirrored = 0;
        int pruned = 0;
        int skipped = 0;
        for (Plugin plugin : pluginRepository.findAll()) {
            Optional<String> repo = repoSlugFrom(plugin.getGithubUrl());
            if (repo.isEmpty()) {
                log.warn("Skipping release sync for {}: '{}' is not a GitHub repository URL",
                        plugin.getSlug(), plugin.getGithubUrl());
                skipped++;
                continue;
            }
            Optional<List<Map<String, Object>>> fetched =
                    gitHubReleaseClient.releases(repo.get(), properties.maxReleasesPerPlugin());
            if (fetched.isEmpty()) {
                skipped++;
                continue;
            }
            boolean wholeHistorySeen = fetched.get().size() < properties.maxReleasesPerPlugin();
            List<PluginVersion> mirroredVersions = upsertAll(plugin, fetched.get());
            mirrored += mirroredVersions.size();
            pruned += prune(plugin, mirroredVersions, wholeHistorySeen);
        }
        log.info("Release sync: mirrored {} releases, pruned {} withdrawn, skipped {} plugins",
                mirrored, pruned, skipped);
    }

    private List<PluginVersion> upsertAll(Plugin plugin, List<Map<String, Object>> rawReleases) {
        Instant syncedAt = Instant.now();
        List<PluginVersion> saved = new ArrayList<>();
        for (Map<String, Object> raw : rawReleases) {
            // A draft is not published: it has no public URL and no published_at,
            // and it must not appear as something a visitor can download.
            if (Boolean.TRUE.equals(raw.get("draft"))) {
                continue;
            }
            try {
                saved.add(upsertOne(plugin, raw, syncedAt));
            } catch (RuntimeException e) {
                log.warn("Skipping malformed release {} for {}: {}",
                        raw.get("tag_name"), plugin.getSlug(), e.getMessage());
            }
        }
        return saved;
    }

    private PluginVersion upsertOne(Plugin plugin, Map<String, Object> raw, Instant syncedAt) {
        String tag = requireText(raw.get("tag_name"), "tag_name");
        PluginVersion version = pluginVersionRepository.findByPluginAndTag(plugin, tag)
                .orElseGet(() -> new PluginVersion(plugin, tag));

        Object name = raw.get("name");
        version.setName(name == null || name.toString().isBlank() ? null : truncate(name.toString(), 256));
        Object body = raw.get("body");
        version.setChangelog(body == null || body.toString().isBlank()
                ? null : truncate(body.toString(), PluginVersion.MAX_CHANGELOG_LENGTH));
        version.setHtmlUrl(requireText(raw.get("html_url"), "html_url"));
        version.setPrerelease(Boolean.TRUE.equals(raw.get("prerelease")));
        version.setPublishedAt(Instant.parse(requireText(raw.get("published_at"), "published_at")));
        version.setLastSyncedAt(syncedAt);
        version.replaceAssets(assetsFrom(raw));

        return pluginVersionRepository.save(version);
    }

    @SuppressWarnings("unchecked")
    private List<PluginVersionAsset> assetsFrom(Map<String, Object> raw) {
        Object rawAssets = raw.get("assets");
        if (!(rawAssets instanceof List<?> assetList)) {
            return List.of();
        }
        List<PluginVersionAsset> assets = new ArrayList<>();
        for (Object entry : assetList) {
            Map<String, Object> asset = (Map<String, Object>) entry;
            Object size = asset.get("size");
            Object downloads = asset.get("download_count");
            assets.add(new PluginVersionAsset(
                    truncate(requireText(asset.get("name"), "asset name"), 256),
                    size instanceof Number number ? number.longValue() : 0L,
                    downloads instanceof Number number ? number.intValue() : 0,
                    requireText(asset.get("browser_download_url"), "browser_download_url")));
        }
        return assets;
    }

    /**
     * Deletes mirrored versions GitHub no longer reports. See the class comment
     * for why {@code wholeHistorySeen} decides how far back that is allowed to
     * reach.
     *
     * @return how many rows were deleted
     */
    private int prune(Plugin plugin, List<PluginVersion> mirroredVersions, boolean wholeHistorySeen) {
        Set<String> seenTags = new HashSet<>();
        Instant oldestSeen = null;
        for (PluginVersion version : mirroredVersions) {
            seenTags.add(version.getTag());
            if (oldestSeen == null || version.getPublishedAt().isBefore(oldestSeen)) {
                oldestSeen = version.getPublishedAt();
            }
        }

        List<PluginVersion> withdrawn = new ArrayList<>();
        for (PluginVersion existing : pluginVersionRepository.findByPluginOrderByPublishedAtDesc(plugin)) {
            if (seenTags.contains(existing.getTag())) {
                continue;
            }
            if (wholeHistorySeen || (oldestSeen != null && !existing.getPublishedAt().isBefore(oldestSeen))) {
                withdrawn.add(existing);
            }
        }
        if (!withdrawn.isEmpty()) {
            pluginVersionRepository.deleteAll(withdrawn);
        }
        return withdrawn.size();
    }

    private static String requireText(Object value, String field) {
        if (value == null || value.toString().isBlank()) {
            throw new IllegalArgumentException("missing " + field);
        }
        return value.toString();
    }

    private static String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
