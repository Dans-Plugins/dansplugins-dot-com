package com.dansplugins.api.service;

import com.dansplugins.api.config.AdminProperties;
import com.dansplugins.api.dto.PluginUpsertRequest;
import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.exception.ResourceNotFoundException;
import com.dansplugins.api.repository.PluginRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.TreeSet;

/**
 * Admin edits to the catalogue: the write side of the {@code plugins} table,
 * which until now changed only by Flyway migration (V15, V19). Gated on
 * {@link AdminProperties} the way feature-request conversion is — there is
 * one catalogue and one author, and a roles system would be more machinery
 * than the site has need of.
 *
 * <p>Deliberately no delete. A plugin row anchors mirrored versions,
 * download counters and every {@code likes.target_id} pointing at it; taking
 * one out of the catalogue is a decision about that history, not a form
 * button, and stays a migration until there is a reason for it to be more.
 */
@Service
@RequiredArgsConstructor
public class PluginCatalogueService {

    private final PluginRepository pluginRepository;
    private final AdminProperties adminProperties;

    @Transactional
    public Plugin create(String requestingUsername, PluginUpsertRequest request) {
        requireAdmin(requestingUsername);
        if (request.slug() == null || request.slug().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "slug is required");
        }
        if (pluginRepository.findBySlug(request.slug()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A plugin with slug '" + request.slug() + "' already exists");
        }
        Plugin plugin = new Plugin(request.slug(), request.title().trim(), request.description().trim(),
                request.githubUrl().trim(), orNull(request.spigotmcUrl()), orNull(request.bstatsId()), orNull(request.iconPath()));
        plugin.replaceTags(normalisedTags(request.tags()));
        return pluginRepository.save(plugin);
    }

    @Transactional
    public Plugin update(String requestingUsername, String slug, PluginUpsertRequest request) {
        requireAdmin(requestingUsername);
        Plugin plugin = pluginRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("No plugin with slug " + slug));
        plugin.setTitle(request.title().trim());
        plugin.setDescription(request.description().trim());
        plugin.setGithubUrl(request.githubUrl().trim());
        plugin.setSpigotmcUrl(orNull(request.spigotmcUrl()));
        plugin.setBstatsId(orNull(request.bstatsId()));
        plugin.setIconPath(orNull(request.iconPath()));
        plugin.replaceTags(normalisedTags(request.tags()));
        return pluginRepository.save(plugin);
    }

    private void requireAdmin(String username) {
        if (!adminProperties.isAdmin(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only an admin can edit the catalogue");
        }
    }

    // "" and whitespace are the absence the old catalogue file spelled that way.
    private static String orNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static List<String> normalisedTags(List<String> tags) {
        if (tags == null) {
            return List.of();
        }
        return List.copyOf(new TreeSet<>(tags.stream().map(String::trim).filter(t -> !t.isEmpty()).toList()));
    }
}
