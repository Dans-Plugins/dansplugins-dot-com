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
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Optional;
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

    /**
     * Brings the mirrored asset list into line with what GitHub reports,
     * reconciling by file name: a file still reported keeps its row and takes
     * the new figures, a file no longer reported loses its row (orphan removal
     * makes that a real delete), and a new file gets one.
     *
     * <p>Reconciling rather than clearing and re-adding matters because of the
     * order Hibernate flushes in — inserts before deletes. Clear-and-re-add a
     * file that is still there and the new row is inserted while the old one
     * still holds {@code (plugin_version_id, name)}, which
     * {@code uq_plugin_version_asset} refuses. It went unseen while the mirror
     * was empty, then broke every hourly sync after the first.
     */
    public void replaceAssets(List<PluginVersionAsset> replacements) {
        Map<String, PluginVersionAsset> reported = new LinkedHashMap<>();
        for (PluginVersionAsset replacement : replacements) {
            reported.put(replacement.getName(), replacement);
        }

        Iterator<PluginVersionAsset> existing = this.assets.iterator();
        while (existing.hasNext()) {
            PluginVersionAsset current = existing.next();
            PluginVersionAsset update = reported.remove(current.getName());
            if (update == null) {
                existing.remove();
                continue;
            }
            current.setSizeBytes(update.getSizeBytes());
            current.setDownloadCount(update.getDownloadCount());
            current.setDownloadUrl(update.getDownloadUrl());
        }
        for (PluginVersionAsset added : reported.values()) {
            added.attachTo(this);
            this.assets.add(added);
        }
    }

    /** What the resource page shows as this release's total download figure. */
    public long totalDownloadCount() {
        return assets.stream().mapToLong(PluginVersionAsset::getDownloadCount).sum();
    }

    /**
     * The file a server operator installs: the release's plugin jar, or empty
     * when the release attaches none. This is the rule Dan's Plugin Manager
     * applies to the same releases — the first {@code .jar} asset — with one
     * refinement, because {@link #assets} is ordered by name and a
     * {@code -sources.jar} sorts ahead of the plugin jar it accompanies: a
     * sources or javadoc jar is passed over unless it is the only jar there is.
     */
    public Optional<PluginVersionAsset> pluginJar() {
        List<PluginVersionAsset> jars = assets.stream()
                .filter(asset -> asset.getName().toLowerCase(Locale.ROOT).endsWith(".jar"))
                .toList();
        return jars.stream()
                .filter(asset -> !isCompanionJar(asset.getName()))
                .findFirst()
                .or(() -> jars.stream().findFirst());
    }

    private static boolean isCompanionJar(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.endsWith("-sources.jar") || lower.endsWith("-javadoc.jar");
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
