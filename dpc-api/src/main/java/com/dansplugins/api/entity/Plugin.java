package com.dansplugins.api.entity;

import jakarta.persistence.Column;
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
