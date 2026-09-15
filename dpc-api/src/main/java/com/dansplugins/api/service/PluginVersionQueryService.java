package com.dansplugins.api.service;

import com.dansplugins.api.dto.PluginDownloadsResponse;
import com.dansplugins.api.dto.PluginLatestVersionResponse;
import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.entity.PluginVersion;
import com.dansplugins.api.repository.PluginVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Read side of the release mirror for callers that want a label rather than a
 * history: one row per plugin, naming the release its catalogue entry should be
 * marked with. Kept separate from {@link ReleaseSyncService}, which owns writing
 * to plugin_versions, in the same split {@link BacklogQueryService} uses.
 *
 * <p>This is the first thing served from plugin_versions that is computed rather
 * than looked up, which is why it is a service at all — {@code PluginController}
 * reaches its repositories directly for everything that is a lookup and a DTO
 * mapping.
 */
@Service
@RequiredArgsConstructor
public class PluginVersionQueryService {

    private final PluginVersionRepository pluginVersionRepository;
    private final PluginDownloadService pluginDownloadService;

    /**
     * Each plugin's latest mirrored release, ordered by slug. A plugin with
     * nothing mirrored is absent rather than present with a null tag: the caller
     * is asking which plugins have a release to name, and "none" is an absence.
     *
     * <p>"Latest" means the newest release that is not a pre-release — what
     * GitHub's own {@code /releases/latest} means by the word, and so what a
     * "Latest: vX.Y.Z" label meant before this mirror existed. A plugin that has
     * published nothing but pre-releases falls back to its newest one rather
     * than dropping out of the answer, and says so via
     * {@link PluginLatestVersionResponse#prerelease()}. This is the same rule
     * the website's {@code latestStableTag} applies to a single plugin's list,
     * and {@link #latestOf(List)} applies to one plugin here.
     */
    @Transactional(readOnly = true)
    public List<PluginLatestVersionResponse> latestPerPlugin() {
        Map<String, PluginVersion> latestBySlug = new LinkedHashMap<>();
        // Newest first, so the first release seen for a plugin is its newest and
        // the only reason to replace it is finding the newest stable one behind it.
        for (PluginVersion version : pluginVersionRepository.findAllWithPluginOrderByPublishedAtDesc()) {
            PluginVersion chosen = latestBySlug.get(version.getPlugin().getSlug());
            if (chosen == null || (chosen.isPrerelease() && !version.isPrerelease())) {
                latestBySlug.put(version.getPlugin().getSlug(), version);
            }
        }

        // One query for every plugin's site download counts, rather than one per card.
        Map<UUID, Map<String, Long>> siteCounts = pluginDownloadService.countsByPluginAndTag();
        List<PluginLatestVersionResponse> latest = new ArrayList<>(latestBySlug.size());
        for (PluginVersion version : latestBySlug.values()) {
            latest.add(PluginLatestVersionResponse.from(version, siteCounts.get(version.getPlugin().getId())));
        }
        latest.sort(Comparator.comparing(PluginLatestVersionResponse::slug));
        return latest;
    }

    /**
     * One plugin's downloads through the site as a SpigotMC resource page
     * shows its own: the total, and the latest release's. The total is taken
     * from the counters alone, so a release GitHub has since withdrawn still
     * counts — those downloads happened; "latest" is the same release
     * {@link #latestPerPlugin()} would name.
     */
    @Transactional(readOnly = true)
    public PluginDownloadsResponse downloadsOf(Plugin plugin) {
        Map<String, Map<String, Long>> siteCounts = pluginDownloadService.countsFor(plugin);
        Optional<PluginVersion> latest = latestOf(pluginVersionRepository.findByPluginOrderByPublishedAtDesc(plugin));
        return new PluginDownloadsResponse(
                PluginDownloadService.total(siteCounts),
                latest.map(PluginVersion::getTag).orElse(null),
                latest.map(version -> PluginDownloadService.sum(siteCounts.get(version.getTag()))).orElse(0L)
        );
    }

    /** The release to call latest among one plugin's releases, newest first: see {@link #latestPerPlugin()}. */
    static Optional<PluginVersion> latestOf(List<PluginVersion> newestFirst) {
        return newestFirst.stream()
                .filter(version -> !version.isPrerelease())
                .findFirst()
                .or(() -> newestFirst.stream().findFirst());
    }
}
