package com.dansplugins.api.entity;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The jar-choosing rule on its own, away from the database: which of a
 * release's files a catalogue card should offer.
 */
class PluginVersionTest {

    private static PluginVersion releaseWith(PluginVersionAsset... assets) {
        PluginVersion version = new PluginVersion(new Plugin(), "v1.0.0");
        version.replaceAssets(List.of(assets));
        return version;
    }

    private static PluginVersionAsset asset(String name) {
        return new PluginVersionAsset(name, 1, 0, "https://example.test/" + name);
    }

    @Test
    void picksTheFirstJar() {
        PluginVersion version = releaseWith(asset("README.md"), asset("Plugin-1.0.0.jar"), asset("Plugin-1.0.0.zip"));
        assertThat(version.pluginJar().map(PluginVersionAsset::getName)).contains("Plugin-1.0.0.jar");
    }

    @Test
    void passesOverSourcesAndJavadocJarsWhenAPluginJarIsThere() {
        PluginVersion version = releaseWith(
                asset("Plugin-1.0.0-javadoc.jar"), asset("Plugin-1.0.0-sources.jar"), asset("Plugin-1.0.0.jar"));
        assertThat(version.pluginJar().map(PluginVersionAsset::getName)).contains("Plugin-1.0.0.jar");
    }

    @Test
    void fallsBackToACompanionJarWhenItIsTheOnlyJar() {
        // A release that publishes only a sources jar is odd, but a jar is still
        // a better offer than nothing — and DPM would hand out the same file.
        PluginVersion version = releaseWith(asset("Plugin-1.0.0-sources.jar"));
        assertThat(version.pluginJar().map(PluginVersionAsset::getName)).contains("Plugin-1.0.0-sources.jar");
    }

    @Test
    void isEmptyWhenNoAssetIsAJar() {
        assertThat(releaseWith(asset("Plugin-1.0.0.zip"), asset("notes.txt")).pluginJar()).isEqualTo(Optional.empty());
        assertThat(releaseWith().pluginJar()).isEqualTo(Optional.empty());
    }

    @Test
    void matchesTheExtensionCaseInsensitively() {
        assertThat(releaseWith(asset("Plugin-1.0.0.JAR")).pluginJar().map(PluginVersionAsset::getName))
                .contains("Plugin-1.0.0.JAR");
    }
}
