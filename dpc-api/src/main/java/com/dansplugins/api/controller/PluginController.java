package com.dansplugins.api.controller;

import com.dansplugins.api.dto.PluginResponse;
import com.dansplugins.api.dto.PluginVersionResponse;
import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.exception.ResourceNotFoundException;
import com.dansplugins.api.repository.PluginRepository;
import com.dansplugins.api.repository.PluginVersionRepository;
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
 * <p>No service layer sits between this and the repository because there is no
 * logic to put in one: every endpoint here is a lookup and a DTO mapping. A
 * service appears when the first computed field (rating aggregates) does. The
 * version list is written by {@link com.dansplugins.api.service.ReleaseSyncService}
 * from GitHub, so it is read-only here for the same reason the catalogue is.
 */
@RestController
@RequestMapping("/api/v1/plugins")
@RequiredArgsConstructor
@Tag(name = "Plugins", description = "The DPC plugin catalogue")
public class PluginController {

    private final PluginRepository pluginRepository;
    private final PluginVersionRepository pluginVersionRepository;

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
