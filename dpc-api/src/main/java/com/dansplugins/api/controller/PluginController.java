package com.dansplugins.api.controller;

import com.dansplugins.api.dto.PluginLatestVersionResponse;
import com.dansplugins.api.dto.PluginResponse;
import com.dansplugins.api.dto.PluginVersionResponse;
import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.exception.ResourceNotFoundException;
import com.dansplugins.api.repository.PluginRepository;
import com.dansplugins.api.repository.PluginVersionRepository;
import com.dansplugins.api.service.PluginVersionQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The plugin catalogue. Entirely public and, for now, entirely read-only — the
 * rows are seeded by {@code V15__create_plugins_table.sql} and edited by
 * migration, not over HTTP. Editing arrives with the admin catalogue UI (see
 * {@code RESOURCE_HUB.md}); until then there is no write path to secure.
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
@Tag(name = "Plugins", description = "The DPC plugin catalogue")
public class PluginController {

    private final PluginRepository pluginRepository;
    private final PluginVersionRepository pluginVersionRepository;
    private final PluginVersionQueryService pluginVersionQueryService;

    @GetMapping
    @Operation(summary = "List every plugin in the catalogue, alphabetically by title")
    public List<PluginResponse> list() {
        return pluginRepository.findAllByOrderByTitleAsc().stream().map(PluginResponse::from).toList();
    }

    @GetMapping("/{slug}")
    @Operation(summary = "Get one plugin by its catalogue slug")
    public PluginResponse get(@PathVariable String slug) {
        return pluginRepository.findBySlug(slug)
                .map(PluginResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("No plugin with slug '" + slug + "'"));
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
        Plugin plugin = pluginRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("No plugin with slug '" + slug + "'"));
        return pluginVersionRepository.findByPluginOrderByPublishedAtDesc(plugin).stream()
                .map(PluginVersionResponse::from)
                .toList();
    }
}
