package com.dansplugins.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * How many times one release asset has been downloaded <em>through
 * dansplugins.com</em>: the site's download links go via
 * {@code /api/v1/plugins/{slug}/versions/{tag}/assets/{name}/download}, which
 * adds one here and redirects to the file on GitHub. This is the figure the
 * site presents the way SpigotMC presents its own — downloads it served, not
 * downloads from everywhere. GitHub's all-sources counter is
 * {@link PluginVersionAsset#getDownloadCount()}.
 *
 * <p>Deliberately not a column on {@link PluginVersionAsset}: the sync replaces
 * a release's asset rows wholesale and deletes releases GitHub withdraws, so a
 * counter there would be reset by the next sync. Keyed by the same natural
 * identifiers the sync matches on instead, this row outlives the mirrored rows
 * it describes, and a download that happened keeps counting toward the
 * plugin's total whatever later happens to the release.
 *
 * <p>Incremented only through
 * {@link com.dansplugins.api.repository.PluginDownloadCountRepository#increment};
 * there is no setter for the count because a read-modify-write of it would lose
 * concurrent downloads.
 */
@Entity
@Table(name = "plugin_download_counts", uniqueConstraints =
        @UniqueConstraint(name = "uq_plugin_download_count", columnNames = {"plugin_id", "tag", "asset_name"}))
@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class PluginDownloadCount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plugin_id", nullable = false)
    private Plugin plugin;

    @Column(name = "tag", nullable = false, length = 128)
    private String tag;

    @Column(name = "asset_name", nullable = false, length = 256)
    private String assetName;

    @Column(name = "download_count", nullable = false)
    private long downloadCount;

    @Column(name = "first_downloaded_at", nullable = false, updatable = false)
    private Instant firstDownloadedAt;

    @Column(name = "last_downloaded_at", nullable = false)
    private Instant lastDownloadedAt;

    /** A counter's first download: the row starts at one, not zero. */
    public PluginDownloadCount(Plugin plugin, String tag, String assetName, Instant downloadedAt) {
        this.plugin = plugin;
        this.tag = tag;
        this.assetName = assetName;
        this.downloadCount = 1;
        this.firstDownloadedAt = downloadedAt;
        this.lastDownloadedAt = downloadedAt;
    }
}
