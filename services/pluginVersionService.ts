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

/** One plugin's latest mirrored release, as `/api/v1/plugins/versions/latest` serves it. */
export interface PluginLatestVersion {
    slug: string;
    tag: string;
    // True when the plugin has published nothing but pre-releases, so the tag
    // above is the newest of those rather than a stable release.
    prerelease: boolean;
    publishedAt: string;
}

/**
 * Every plugin's latest mirrored release tag, keyed by catalogue slug — one
 * request for a page rendering the whole catalogue, rather than one per card.
 *
 * A plugin with nothing mirrored is simply absent from the map, and so is every
 * plugin when the API cannot be reached: the tag is a label on a card, so its
 * absence hides a chip rather than failing the page. There is deliberately no
 * fall back to GitHub here — doing that for a whole catalogue is the per-render
 * call storm the mirror exists to avoid.
 *
 * Unlike `getPluginVersions` above, a failure here is logged. One unanswered
 * request blanks every chip on the busiest page at once, and nothing is left
 * behind it to notice — so without a line in the server log, a misconfigured
 * NEXT_PUBLIC_API_URL looks exactly like a catalogue that has mirrored no
 * releases yet.
 */
export const getLatestVersionsBySlug = async (): Promise<Map<string, string>> => {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/v1/plugins/versions/latest`);
        if (!res.ok) {
            console.error(
                `Error fetching latest plugin versions: HTTP ${res.status} ${res.statusText}`
            );
            return new Map();
        }
        const latest = await res.json();
        if (!Array.isArray(latest)) {
            console.error('Error fetching latest plugin versions: response body was not an array.');
            return new Map();
        }
        return new Map(
            (latest as PluginLatestVersion[])
                .filter((entry) => typeof entry?.slug === 'string' && typeof entry?.tag === 'string')
                .map((entry): [string, string] => [entry.slug, entry.tag])
        );
    } catch (error) {
        console.error('Error fetching latest plugin versions:', error);
        return new Map();
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
