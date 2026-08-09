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
import lombok.Setter;

import java.util.UUID;

/**
 * One downloadable file attached to a {@link PluginVersion} — the jar a server
 * owner actually installs.
 *
 * <p>{@code downloadUrl} points at GitHub, never at this service: DPC mirrors
 * the metadata about a release asset and none of its bytes, so there is nothing
 * here to store, scan or take down. {@code downloadCount} is GitHub's counter,
 * copied at sync time; the download never passes through dpc-api, so it could
 * not be counted here even in principle.
 */
@Entity
@Table(name = "plugin_version_assets", uniqueConstraints =
        @UniqueConstraint(name = "uq_plugin_version_asset", columnNames = {"plugin_version_id", "name"}))
@Getter
@Setter
@NoArgsConstructor(access = lombok.AccessLevel.PROTECTED)
public class PluginVersionAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Setter(lombok.AccessLevel.NONE)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plugin_version_id", nullable = false)
    @Setter(lombok.AccessLevel.NONE)
    private PluginVersion pluginVersion;

    @Column(name = "name", nullable = false, length = 256)
    @Setter(lombok.AccessLevel.NONE)
    private String name;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "download_count", nullable = false)
    private int downloadCount;

    @Column(name = "download_url", nullable = false, length = 512)
    private String downloadUrl;

    public PluginVersionAsset(String name, long sizeBytes, int downloadCount, String downloadUrl) {
        this.name = name;
        this.sizeBytes = sizeBytes;
        this.downloadCount = downloadCount;
        this.downloadUrl = downloadUrl;
    }

    /** Set by {@link PluginVersion#replaceAssets(java.util.List)}; the owning side of the association. */
    void attachTo(PluginVersion version) {
        this.pluginVersion = version;
    }
}
