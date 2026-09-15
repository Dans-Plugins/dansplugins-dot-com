package com.dansplugins.api.controller;

import com.dansplugins.api.dto.PluginDownloadsResponse;
import com.dansplugins.api.dto.PluginLatestVersionResponse;
import com.dansplugins.api.dto.PluginResponse;
import com.dansplugins.api.dto.PluginVersionResponse;
import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.exception.ResourceNotFoundException;
import com.dansplugins.api.repository.PluginRepository;
import com.dansplugins.api.repository.PluginVersionRepository;
import com.dansplugins.api.service.PluginDownloadService;
import com.dansplugins.api.service.PluginVersionQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.Map;

/**
 * The plugin catalogue. Entirely public and, for now, entirely read-only — the
 * rows are seeded by {@code V15__create_plugins_table.sql} and edited by
 * migration, not over HTTP. Editing arrives with the admin catalogue UI (see
 * {@code RESOURCE_HUB.md}); until then there is no write path to secure. The
 * one thing a visitor's request does write — a download counter, via the
 * redirecting {@code /download} link — is a GET by necessity, since it is a
 * link a browser follows, and is public for the same reason.
 *
 * <p>No service layer sits between this and the repository for the lookups,
 * because there is no logic to put in one: each is a find and a DTO mapping. The
 * one endpoint that computes something — which release to label a plugin with —
 * delegates to {@link PluginVersionQueryService} instead. The version list is
 * written by {@link com.dansplugins.api.service.ReleaseSyncService} from GitHub,
 * so it is read-only here for the same reason the catalogue is.
 */
@RestController
@RequestMapping("/api/v1/plugins")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Plugins", description = "The DPC plugin catalogue")
public class PluginController {

    private final PluginRepository pluginRepository;
    private final PluginVersionRepository pluginVersionRepository;
    private final PluginVersionQueryService pluginVersionQueryService;
    private final PluginDownloadService pluginDownloadService;

    @GetMapping
    @Operation(summary = "List every plugin in the catalogue, alphabetically by title")
    public List<PluginResponse> list() {
        return pluginRepository.findAllByOrderByTitleAsc().stream().map(PluginResponse::from).toList();
    }

    @GetMapping("/{slug}")
    @Operation(summary = "Get one plugin by its catalogue slug")
    public PluginResponse get(@PathVariable String slug) {
        return PluginResponse.from(findPlugin(slug));
    }

    /**
     * Exists so a page showing the whole catalogue at once can label every card
     * with one request instead of one per plugin — the home page's sixteen.
     *
     * <p>Mapped at {@code /versions/latest} rather than {@code /latest-versions}
     * so that nothing has to be known about how Spring ranks a literal segment
     * against the {@code /{slug}} template: no request can match both this and
     * {@code /{slug}/versions}, whose second segment is the literal one.
     */
    @GetMapping("/versions/latest")
    @Operation(summary = "Each plugin's latest mirrored release, one row per plugin that has one")
    public List<PluginLatestVersionResponse> latestVersions() {
        return pluginVersionQueryService.latestPerPlugin();
    }

    /**
     * An unknown slug is a 404, but a known plugin with nothing mirrored yet is
     * an empty list and a 200: "this plugin publishes no releases" is an answer,
     * and a resource page renders it as such rather than as a broken section.
     */
    @GetMapping("/{slug}/versions")
    @Operation(summary = "List a plugin's mirrored GitHub releases, newest first")
    public List<PluginVersionResponse> versions(@PathVariable String slug) {
        Plugin plugin = findPlugin(slug);
        Map<String, Map<String, Long>> siteCounts = pluginDownloadService.countsFor(plugin);
        return pluginVersionRepository.findByPluginOrderByPublishedAtDesc(plugin).stream()
                .map(version -> PluginVersionResponse.from(slug, version, siteCounts.get(version.getTag())))
                .toList();
    }

    @GetMapping("/{slug}/downloads")
    @Operation(summary = "A plugin's downloads through dansplugins.com: in total, and of its latest release")
    public PluginDownloadsResponse downloads(@PathVariable String slug) {
        return pluginVersionQueryService.downloadsOf(findPlugin(slug));
    }

    /**
     * The link the site's Download buttons point at. Counts the download and
     * sends the browser on to the file on GitHub — the bytes never pass
     * through here, as {@code RESOURCE_HUB.md} requires. A HEAD (a link
     * checker, a browser preflighting) is answered with the same redirect but
     * not counted, and the response asks crawlers not to index or follow it.
     *
     * <p>The redirect is issued even when counting fails: a visitor's download
     * must not break because a counter could not be written, so that failure
     * is a log line rather than a 500. The target is always the mirror's URL
     * for the named file, never anything from the request.
     */
    @GetMapping("/{slug}/versions/{tag}/assets/{assetName}/download")
    @Operation(summary = "Count a download made through dansplugins.com and redirect to the file on GitHub")
    @ApiResponse(responseCode = "302", description = "Redirect to the file on GitHub")
    @ApiResponse(responseCode = "404", description = "No such plugin, release or file in the mirror")
    public ResponseEntity<Void> download(@PathVariable String slug, @PathVariable String tag,
                                         @PathVariable String assetName, HttpServletRequest request) {
        Plugin plugin = findPlugin(slug);
        String target = pluginDownloadService.resolve(plugin, tag, assetName);
        if (!HttpMethod.HEAD.matches(request.getMethod())) {
            try {
                pluginDownloadService.count(plugin, tag, assetName);
            } catch (RuntimeException e) {
                log.warn("Download of {} {} {} could not be counted", slug, tag, assetName, e);
            }
        }
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(target))
                .header("X-Robots-Tag", "noindex, nofollow")
                .cacheControl(CacheControl.noStore())
                .build();
    }

    private Plugin findPlugin(String slug) {
        return pluginRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("No plugin with slug '" + slug + "'"));
    }
}
