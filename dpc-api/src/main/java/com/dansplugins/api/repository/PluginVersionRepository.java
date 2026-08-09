package com.dansplugins.api.repository;

import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.entity.PluginVersion;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PluginVersionRepository extends JpaRepository<PluginVersion, UUID> {

    /**
     * One plugin's mirrored releases, newest first — the only read pattern the
     * resource page has. The entity graph pulls the assets in the same query:
     * every version rendered lists its download links, so lazy-loading them
     * would be one extra query per release for no benefit.
     */
    @EntityGraph(attributePaths = "assets")
    List<PluginVersion> findByPluginOrderByPublishedAtDesc(Plugin plugin);

    /** The upsert key the sync matches on: a tag is unique within a repository. */
    @EntityGraph(attributePaths = "assets")
    Optional<PluginVersion> findByPluginAndTag(Plugin plugin, String tag);
}
