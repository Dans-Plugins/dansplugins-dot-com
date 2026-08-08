package com.dansplugins.api.controller;

import com.dansplugins.api.dto.PluginResponse;
import com.dansplugins.api.exception.ResourceNotFoundException;
import com.dansplugins.api.repository.PluginRepository;
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
 * logic to put in one: both endpoints are a lookup and a DTO mapping. A service
 * appears when the first computed field (rating aggregates, latest version) does.
 */
@RestController
@RequestMapping("/api/v1/plugins")
@RequiredArgsConstructor
@Tag(name = "Plugins", description = "The DPC plugin catalogue")
public class PluginController {

    private final PluginRepository pluginRepository;

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
}
