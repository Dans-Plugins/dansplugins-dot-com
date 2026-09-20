package com.dansplugins.api.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * One plugin in the DPC catalogue — the thing a resource page is about, and the
 * row that per-plugin community state (versions, reviews, discussion) will hang
 * off as the resource hub is built out. See {@code RESOURCE_HUB.md}.
 *
 * <p>Seeded by {@code V15__create_plugins_table.sql} from the catalogue file the
 * site currently renders from, and served read-only until the site switches over
 * to this table. The {@code slug} is the id that file already uses, so existing
 * {@code /guides/[id]} URLs and {@code likes.target_id} rows keep resolving.
 *
 * <p>{@code spigotmcUrl}, {@code bstatsId} and {@code iconPath} are nullable:
 * not every plugin is published on SpigotMC or has a bStats project, and the
 * absence is stored as NULL rather than the empty string the catalogue file uses.
 */
@Entity
@Table(name = "plugins")
@Getter
@Setter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class Plugin {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(lombok.AccessLevel.NONE)
    private UUID id;

    @Column(name = "slug", nullable = false, unique = true, length = 64)
    @Setter(lombok.AccessLevel.NONE)
    private String slug;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "description", nullable = false, length = 500)
    private String description;

    @Column(name = "github_url", nullable = false, length = 512)
    private String githubUrl;

    @Column(name = "spigotmc_url", length = 512)
    private String spigotmcUrl;

    @Column(name = "bstats_id", length = 32)
    private String bstatsId;

    @Column(name = "icon_path", length = 256)
    private String iconPath;

    // When the first release was published, recorded once by the release sync
    // (see V18); null until it has been, and for a plugin with no releases.
    @Column(name = "first_released_at")
    private Instant firstReleasedAt;

    // What the plugin is for, as a set of short lower-case words (V20). Read
    // eagerly: the catalogue is sixteen rows and every listing wants them.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "plugin_tags", joinColumns = @JoinColumn(name = "plugin_id"))
    @Column(name = "tag", nullable = false, length = 32)
    @Setter(lombok.AccessLevel.NONE)
    private Set<String> tags = new HashSet<>();

    /** Replaces the tag set in place, so Hibernate keeps tracking the same collection. */
    public void replaceTags(java.util.Collection<String> newTags) {
        tags.clear();
        tags.addAll(newTags);
    }

    @Column(name = "created_at", nullable = false, updatable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    @Setter(lombok.AccessLevel.NONE)
    private Instant updatedAt;

    public Plugin(String slug, String title, String description, String githubUrl,
                  String spigotmcUrl, String bstatsId, String iconPath) {
        this.slug = slug;
        this.title = title;
        this.description = description;
        this.githubUrl = githubUrl;
        this.spigotmcUrl = spigotmcUrl;
        this.bstatsId = bstatsId;
        this.iconPath = iconPath;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
