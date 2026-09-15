package com.dansplugins.api.service;

import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.entity.PluginDownloadCount;
import com.dansplugins.api.entity.PluginVersion;
import com.dansplugins.api.entity.PluginVersionAsset;
import com.dansplugins.api.exception.ResourceNotFoundException;
import com.dansplugins.api.repository.PluginDownloadCountRepository;
import com.dansplugins.api.repository.PluginDownloadCountRepository.VersionCount;
import com.dansplugins.api.repository.PluginVersionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Downloads made through dansplugins.com. The site's download links point at
 * {@link #downloadPath} rather than at GitHub; {@link #resolve} finds the file
 * and {@link #count} adds one to its counter, and the controller redirects.
 *
 * <p>The two are separate on purpose: a visitor's download must never fail
 * because counting it did — the redirect is issued whether or not the counter
 * could be written — so the controller resolves first, counts in its own
 * transaction, and treats a counting failure as a log line.
 *
 * <p>The read side ({@link #countsFor}, {@link #countsByPluginAndTag}) hands
 * back plain maps keyed by tag and asset name — the same natural keys the
 * counters are stored under — so a DTO can be built from a mirrored version
 * and a lookup without the entity knowing the counter exists.
 */
@Service
@Slf4j
public class PluginDownloadService {

    private final PluginVersionRepository pluginVersionRepository;
    private final PluginDownloadCountRepository downloadCountRepository;
    private final TransactionTemplate transaction;

    public PluginDownloadService(PluginVersionRepository pluginVersionRepository,
                                 PluginDownloadCountRepository downloadCountRepository,
                                 PlatformTransactionManager transactionManager) {
        this.pluginVersionRepository = pluginVersionRepository;
        this.downloadCountRepository = downloadCountRepository;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    /** Where the site sends a download so it is counted: the API's own path, relative to its origin. */
    public static String downloadPath(String slug, String tag, String assetName) {
        return "/api/v1/plugins/" + segment(slug) + "/versions/" + segment(tag)
                + "/assets/" + segment(assetName) + "/download";
    }

    private static String segment(String value) {
        return UriUtils.encodePathSegment(value, StandardCharsets.UTF_8);
    }

    /**
     * The GitHub URL of one mirrored asset, or a 404 for any part of the
     * address that the mirror does not know. Only what the mirror reports can
     * be redirected to: the redirect target is never taken from the request.
     */
    @Transactional(readOnly = true)
    public String resolve(Plugin plugin, String tag, String assetName) {
        PluginVersion version = pluginVersionRepository.findByPluginAndTag(plugin, tag)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No release '" + tag + "' of plugin '" + plugin.getSlug() + "'"));
        return version.getAssets().stream()
                .filter(asset -> asset.getName().equals(assetName))
                .map(PluginVersionAsset::getDownloadUrl)
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Release '" + tag + "' of plugin '" + plugin.getSlug() + "' has no file '" + assetName + "'"));
    }

    /**
     * Adds one to the asset's counter, creating it on the first download. The
     * increment is a single UPDATE so concurrent downloads all count; only the
     * very first download of an asset can race, when two requests both find no
     * row and both insert — the loser's unique-constraint violation is retried
     * as an update, which now finds the winner's row.
     */
    public void count(Plugin plugin, String tag, String assetName) {
        try {
            transaction.executeWithoutResult(status -> incrementOrInsert(plugin, tag, assetName));
        } catch (DataIntegrityViolationException raced) {
            transaction.executeWithoutResult(status -> incrementOrInsert(plugin, tag, assetName));
        }
    }

    private void incrementOrInsert(Plugin plugin, String tag, String assetName) {
        Instant now = Instant.now();
        if (downloadCountRepository.increment(plugin, tag, assetName, now) == 0) {
            downloadCountRepository.save(new PluginDownloadCount(plugin, tag, assetName, now));
        }
    }

    /** One plugin's counters: tag → asset name → downloads through the site. */
    @Transactional(readOnly = true)
    public Map<String, Map<String, Long>> countsFor(Plugin plugin) {
        Map<String, Map<String, Long>> byTag = new HashMap<>();
        for (PluginDownloadCount count : downloadCountRepository.findByPlugin(plugin)) {
            byTag.computeIfAbsent(count.getTag(), tag -> new HashMap<>())
                    .merge(count.getAssetName(), count.getDownloadCount(), Long::sum);
        }
        return byTag;
    }

    /** Every plugin's counters summed per release: plugin id → tag → downloads through the site. */
    @Transactional(readOnly = true)
    public Map<UUID, Map<String, Long>> countsByPluginAndTag() {
        Map<UUID, Map<String, Long>> byPlugin = new HashMap<>();
        for (VersionCount count : downloadCountRepository.sumByPluginAndTag()) {
            byPlugin.computeIfAbsent(count.getPluginId(), id -> new HashMap<>())
                    .merge(count.getTag(), count.getCount(), Long::sum);
        }
        return byPlugin;
    }

    /**
     * The values of one lookup summed: a release's assets for that release's
     * figure, or a plugin's releases (from {@link #countsByPluginAndTag()}) for
     * its total. Null — no counters at all — is zero.
     */
    public static long sum(Map<String, Long> counts) {
        return counts == null ? 0 : counts.values().stream().mapToLong(Long::longValue).sum();
    }

    /** A plugin's downloads through the site across every release, withdrawn ones included. */
    public static long total(Map<String, Map<String, Long>> byTag) {
        return byTag.values().stream().mapToLong(PluginDownloadService::sum).sum();
    }

}
