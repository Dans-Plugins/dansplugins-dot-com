package com.dansplugins.api.repository;

import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.entity.PluginVersion;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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

    /**
     * Every mirrored release across the whole catalogue, newest first, with its
     * plugin joined in — what {@code PluginVersionQueryService} folds down to one
     * row per plugin. The plugin is fetched rather than left as a lazy proxy
     * because every row's slug is read; the assets are deliberately *not*,
     * because none are.
     */
    @Query("select v from PluginVersion v join fetch v.plugin order by v.publishedAt desc")
    List<PluginVersion> findAllWithPluginOrderByPublishedAtDesc();

    /** The upsert key the sync matches on: a tag is unique within a repository. */
    @EntityGraph(attributePaths = "assets")
    Optional<PluginVersion> findByPluginAndTag(Plugin plugin, String tag);
}
