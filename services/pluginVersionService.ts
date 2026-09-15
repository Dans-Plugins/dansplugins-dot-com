// Reads the release history dpc-api mirrors from GitHub (`plugin_versions`,
// refreshed by its scheduled ReleaseSyncService). Called server-side by the
// resource page rather than from the browser: the mirror exists so a visitor
// never waits on — or gets rate-limited by — GitHub, and reading it during
// server rendering keeps the version list in the page's initial HTML.
//
// DPC hosts none of these files. Every downloadUrl points at the asset on
// GitHub; the rows here are metadata about files that live elsewhere. See
// RESOURCE_HUB.md.
//
// Two download figures travel with every release. `downloadCount` is GitHub's:
// downloads from anywhere, copied at sync time. `siteDownloadCount` is
// dpc-api's own: downloads made through this site, which is what the pages
// present the way SpigotMC presents its own. The second is counted because the
// site's download links go through the API's `downloadPath`, which adds one
// and redirects to GitHub — see siteDownloadUrl() below.
import {getApiBaseUrl, getPublicApiBaseUrl} from '../utils/apiBase';

export interface PluginVersionAsset {
    name: string;
    sizeBytes: number;
    downloadCount: number;
    downloadUrl: string;
    siteDownloadCount: number;
    // The API's counting link for the file, relative to its origin. Absent
    // from an API older than the counter, in which case the link is GitHub's.
    downloadPath?: string | null;
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
    // The same sum of the site's own counters.
    siteDownloadCount: number;
    assets: PluginVersionAsset[];
}

/**
 * Where a Download button sends the visitor: the API's counting link when the
 * mirror served one, else the file on GitHub directly. Always the *public* API
 * origin — this is a link the browser follows, even when the server renders it.
 */
export const siteDownloadUrl = (asset: {downloadUrl: string; downloadPath?: string | null}): string =>
    typeof asset.downloadPath === 'string' && asset.downloadPath
        ? `${getPublicApiBaseUrl()}${asset.downloadPath}`
        : asset.downloadUrl;

/** "1 download", "1,204 downloads" — one wording for every place a figure is shown. */
export const downloadsLabel = (count: number): string =>
    `${count.toLocaleString()} ${count === 1 ? 'download' : 'downloads'}`;

/** A plugin's downloads through the site, as `/api/v1/plugins/{slug}/downloads` serves them. */
export interface PluginDownloads {
    // Every release summed, releases since withdrawn from GitHub included.
    total: number;
    // The release the catalogue labels as latest; null when nothing is mirrored.
    latestTag: string | null;
    // That release's downloads; 0 when latestTag is null.
    latest: number;
}

/**
 * The SpigotMC pair for one plugin — total downloads and the latest release's —
 * or null for anything short of a well-formed success, in which case the page
 * omits the figures rather than showing zeros it cannot vouch for.
 */
export const getPluginDownloads = async (slug: string): Promise<PluginDownloads | null> => {
    try {
        const res = await fetch(
            `${getApiBaseUrl()}/api/v1/plugins/${encodeURIComponent(slug)}/downloads`
        );
        if (!res.ok) {
            return null;
        }
        const body = await res.json();
        if (typeof body?.total !== 'number' || typeof body?.latest !== 'number') {
            return null;
        }
        return {
            total: body.total,
            latestTag: typeof body.latestTag === 'string' ? body.latestTag : null,
            latest: body.latest,
        };
    } catch {
        return null;
    }
};

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
    // That release's plugin jar on GitHub — the one file a catalogue card
    // offers — or null when the release attaches no jar.
    downloadUrl: string | null;
    // The API's counting link for the same jar; null alongside downloadUrl,
    // and absent from an API older than the counter.
    downloadPath?: string | null;
    // Downloads through the site: of this release, and of the plugin in total.
    siteDownloadCount?: number;
    totalSiteDownloadCount?: number;
}

/** What the home page needs per card from the mirror: a label, a file to offer, and a figure. */
export interface LatestVersionLabel {
    tag: string;
    // The link the card's Download button follows: the API's counting link
    // when there is one, else the jar on GitHub — see siteDownloadUrl().
    downloadUrl: string | null;
    // The plugin's downloads through the site, every release summed.
    downloadCount: number;
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
export const getLatestVersionsBySlug = async (): Promise<Map<string, LatestVersionLabel>> => {
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
                .map((entry): [string, LatestVersionLabel] => [entry.slug, {
                    tag: entry.tag,
                    // Anything but a string is "no file": an API older than
                    // this field, or an explicit null, both hide the button.
                    downloadUrl: typeof entry.downloadUrl === 'string'
                        ? siteDownloadUrl({downloadUrl: entry.downloadUrl, downloadPath: entry.downloadPath})
                        : null,
                    downloadCount: typeof entry.totalSiteDownloadCount === 'number' ? entry.totalSiteDownloadCount : 0,
                }])
        );
    } catch (error) {
        console.error('Error fetching latest plugin versions:', error);
        return new Map();
    }
};

/** Every mirrored release's GitHub downloads summed — the resource page's "on GitHub" figure. */
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
