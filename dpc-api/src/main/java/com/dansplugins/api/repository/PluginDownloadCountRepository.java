package com.dansplugins.api.repository;

import com.dansplugins.api.entity.Plugin;
import com.dansplugins.api.entity.PluginDownloadCount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface PluginDownloadCountRepository extends JpaRepository<PluginDownloadCount, UUID> {

    /**
     * Adds one to an existing counter in the database rather than in Java, so
     * two downloads landing at once both count. Returns the number of rows
     * touched: 0 means there is no counter yet and the caller inserts one.
     */
    @Modifying(clearAutomatically = true)
    @Query("update PluginDownloadCount c set c.downloadCount = c.downloadCount + 1, c.lastDownloadedAt = :now "
            + "where c.plugin = :plugin and c.tag = :tag and c.assetName = :assetName")
    int increment(@Param("plugin") Plugin plugin, @Param("tag") String tag,
                  @Param("assetName") String assetName, @Param("now") Instant now);

    /** Every counter of one plugin — few rows (one per asset per release), so the caller sums and groups. */
    List<PluginDownloadCount> findByPlugin(Plugin plugin);

    /** One row per (plugin, tag) across the catalogue, for labelling every card with one query. */
    @Query("select c.plugin.id as pluginId, c.tag as tag, sum(c.downloadCount) as count "
            + "from PluginDownloadCount c group by c.plugin.id, c.tag")
    List<VersionCount> sumByPluginAndTag();

    interface VersionCount {
        UUID getPluginId();
        String getTag();
        long getCount();
    }
}
