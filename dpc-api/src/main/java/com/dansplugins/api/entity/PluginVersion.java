package com.dansplugins.api.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * One published release of one plugin, mirrored from GitHub by
 * {@link com.dansplugins.api.service.ReleaseSyncService}. GitHub is the system
 * of record — nothing here is authored on this side, and a release GitHub stops
 * reporting is deleted rather than kept as a second, divergent history.
 *
 * <p>Unlike {@link BacklogItem}, which flips to CLOSED so the dev console can
 * still show recently-closed work, a version has no "was published, now isn't"
 * state worth showing: a deleted release is one a visitor must not be offered a
 * download link for.
 *
 * <p>The {@code changelog} is the release body as the author wrote it, in
 * Markdown. It is rendered on the resource page with raw HTML parsing disabled;
 * the trust boundary is documented where it is rendered, not here.
 */
@Entity
@Table(name = "plugin_versions", uniqueConstraints =
        @UniqueConstraint(name = "uq_plugin_version", columnNames = {"plugin_id", "tag"}))
@Getter
@Setter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class PluginVersion {

    /** Longest changelog stored; longer release bodies are truncated to fit by the sync. */
    public static final int MAX_CHANGELOG_LENGTH = 20000;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(lombok.AccessLevel.NONE)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plugin_id", nullable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Plugin plugin;

    @Column(name = "tag", nullable = false, length = 128)
    @Setter(lombok.AccessLevel.NONE)
    private String tag;

    @Column(name = "name", length = 256)
    private String name;

    @Column(name = "changelog", length = MAX_CHANGELOG_LENGTH)
    private String changelog;

    @Column(name = "html_url", nullable = false, length = 512)
    private String htmlUrl;

    @Column(name = "prerelease", nullable = false)
    private boolean prerelease;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt;

    @Column(name = "last_synced_at", nullable = false)
    private Instant lastSyncedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Instant updatedAt;

    /**
     * The downloadable files attached to the release. Owned by the version:
     * GitHub reports a release's assets as a whole, so a sync replaces the list
     * rather than reconciling it member by member, and orphan removal is what
     * makes a withdrawn asset actually disappear.
     */
    @OneToMany(mappedBy = "pluginVersion", cascade = CascadeType.ALL, orphanRemoval = true,
            fetch = FetchType.LAZY)
    @OrderBy("name ASC")
    @Setter(lombok.AccessLevel.NONE)
    private List<PluginVersionAsset> assets = new ArrayList<>();

    public PluginVersion(Plugin plugin, String tag) {
        this.plugin = plugin;
        this.tag = tag;
    }

    /** Replaces the mirrored asset list in place, so orphan removal sees the deletions. */
    public void replaceAssets(List<PluginVersionAsset> replacements) {
        this.assets.clear();
        for (PluginVersionAsset asset : replacements) {
            asset.attachTo(this);
            this.assets.add(asset);
        }
    }

    /** What the resource page shows as this release's total download figure. */
    public long totalDownloadCount() {
        return assets.stream().mapToLong(PluginVersionAsset::getDownloadCount).sum();
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
