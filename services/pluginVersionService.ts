// Reads the release history dpc-api mirrors from GitHub (`plugin_versions`,
// refreshed by its scheduled ReleaseSyncService). Called server-side by the
// resource page rather than from the browser: the mirror exists so a visitor
// never waits on — or gets rate-limited by — GitHub, and reading it during
// server rendering keeps the version list in the page's initial HTML.
//
// DPC hosts none of these files. Every downloadUrl points at the asset on
// GitHub; the rows here are metadata about files that live elsewhere. See
// RESOURCE_HUB.md.
import {getApiBaseUrl} from '../utils/apiBase';

export interface PluginVersionAsset {
    name: string;
    sizeBytes: number;
    downloadCount: number;
    downloadUrl: string;
}

export interface PluginVersion {
    tag: string;
    // Null when the release was published without a title; the page falls back
    // to the tag.
    name: string | null;
    // The release body, as its author wrote it, in Markdown. Null when empty.
    changelog: string | null;
    htmlUrl: string;
    prerelease: boolean;
    publishedAt: string;
    // This release's assets summed, served so a caller showing one number does
    // not have to know how many files a release attaches.
    downloadCount: number;
    assets: PluginVersionAsset[];
}

/**
 * One plugin's mirrored releases, newest first.
 *
 * Resolves to an empty list for anything short of a successful response — an
 * unknown slug, an unreachable API, a malformed body. The version history is an
 * enrichment of the resource page, so its absence hides a section rather than
 * failing the page, exactly as the bStats and GitHub chips already do.
 */
export const getPluginVersions = async (slug: string): Promise<PluginVersion[]> => {
    try {
        const res = await fetch(
            `${getApiBaseUrl()}/api/v1/plugins/${encodeURIComponent(slug)}/versions`
        );
        if (!res.ok) {
            return [];
        }
        const versions = await res.json();
        return Array.isArray(versions) ? versions : [];
    } catch {
        return [];
    }
};

/** Every mirrored release's downloads summed — what the resource page shows as one figure. */
export const totalDownloads = (versions: PluginVersion[]): number =>
    versions.reduce((sum, version) => sum + (version.downloadCount || 0), 0);

/**
 * The tag to show as "Latest": the newest release that isn't a pre-release,
 * which is what GitHub's own `/releases/latest` means by the word and therefore
 * what the chip meant before the mirror existed. A plugin with nothing but
 * pre-releases falls back to its newest one rather than showing no version at
 * all; an empty list has no answer.
 *
 * @param versions mirrored releases, newest first
 */
export const latestStableTag = (versions: PluginVersion[]): string | null => {
    const stable = versions.find((version) => !version.prerelease);
    return (stable ?? versions[0])?.tag ?? null;
};
