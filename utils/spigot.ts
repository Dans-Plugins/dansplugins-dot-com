/**
 * What a plugin's SpigotMC listing says about it, read through Spiget
 * (https://spiget.org), the public JSON mirror of SpigotMC's resource data:
 * the Minecraft versions it has been tested on, its rating, and its
 * SpigotMC download count.
 *
 * SpigotMC's "Tested Minecraft Versions" field is the one the author already
 * keeps up to date, so the site mirrors it the way it mirrors bStats server
 * counts rather than carrying a second, hand-maintained copy that would
 * drift. Nothing else records the range: a GitHub release payload has no
 * such field, and plugin.yml's api-version is a floor, not a tested set.
 *
 * The rating is a bridge: until the site has reviews of its own, SpigotMC's
 * is the one people already trust, and it is shown as SpigotMC's — labelled
 * and linked there — never as this site's. What happens to it once on-site
 * reviews exist is that phase's decision.
 */

/** A SpigotMC listing, as far as the site reads it. */
export interface SpigotListing {
    testedVersions: string[];
    // SpigotMC's star rating; null when the listing has no rating figures at
    // all. A count of 0 is a listing nobody has reviewed yet.
    rating: { average: number; count: number } | null;
    // SpigotMC's own download count; null when the listing does not carry one.
    downloads: number | null;
}

/**
 * The fewest SpigotMC reviews a plugin needs before its rating is shown —
 * RESOURCE_HUB.md's empty-state rule, applied to the bridged figure as it
 * will be to the site's own: a five-star average over one review says
 * nothing, and a row of zeroed stars reads as abandonment.
 */
export const MIN_REVIEWS_FOR_RATING = 3;

/**
 * How long one Spiget request may take before it is abandoned — the same
 * bound bStats gets, for the same reason: the home page asks once per
 * plugin, and an unbounded hang there once took the whole site offline.
 */
export const SPIGOT_TIMEOUT_MS = 3_000;

/** How long a fetched list is served before Spiget is asked again. */
export const SPIGOT_CACHE_TTL_MS = 10 * 60 * 1_000;

type CacheEntry = { listing: SpigotListing | undefined; fetchedAt: number };

// Module-level: one cache per server process. A listing changes with a
// plugin release or a review, so a ten-minute-old one is fine, and during an
// outage the last good listing keeps being shown instead of nothing.
const cache = new Map<string, CacheEntry>();

/** Test hook: forget every cached listing. */
export function clearSpigotListingCache(): void {
    cache.clear();
}

/**
 * The numeric resource id at the end of a SpigotMC resource URL —
 * `https://www.spigotmc.org/resources/medieval-factions.79941/` is 79941 —
 * or undefined for a plugin with no SpigotMC page (the catalogue writes
 * that as an empty string) or a link that does not carry one.
 */
export function spigotResourceId(spigotmcLink: string | undefined | null): string | undefined {
    if (!spigotmcLink) {
        return undefined;
    }
    const match = /\.(\d+)\/?(?:[?#].*)?$/.exec(spigotmcLink.trim());
    return match ? match[1] : undefined;
}

/**
 * Fetches a SpigotMC resource's listing.
 * @param resourceId The SpigotMC resource id
 * @returns The listing, or undefined if unavailable/error
 */
export async function getSpigotListing(resourceId: string): Promise<SpigotListing | undefined> {
    const cached = cache.get(resourceId);
    if (cached && Date.now() - cached.fetchedAt < SPIGOT_CACHE_TTL_MS) {
        return cached.listing;
    }

    const fresh = await fetchListing(resourceId);
    if (fresh !== undefined) {
        cache.set(resourceId, { listing: fresh, fetchedAt: Date.now() });
        return fresh;
    }

    // Stale beats blank: keep showing the last good listing through an
    // outage, and re-stamp it so the next render does not pay the timeout
    // again until the TTL has passed.
    if (cached) {
        cache.set(resourceId, { listing: cached.listing, fetchedAt: Date.now() });
        return cached.listing;
    }
    return undefined;
}

async function fetchListing(resourceId: string): Promise<SpigotListing | undefined> {
    try {
        const response = await fetch(
            'https://api.spiget.org/v2/resources/' + resourceId + '?fields=testedVersions,rating,downloads',
            { signal: AbortSignal.timeout(SPIGOT_TIMEOUT_MS) }
        );

        if (!response.ok) {
            console.error(
                `Error fetching SpigotMC resource ${resourceId}: HTTP ${response.status} ${response.statusText}`
            );
            return undefined;
        }

        const data = await response.json();
        if (!data || typeof data !== 'object') {
            return undefined;
        }
        const versions = Array.isArray(data.testedVersions)
            ? data.testedVersions.filter((v: unknown): v is string => typeof v === 'string' && v.trim() !== '')
            : [];
        const rating = data.rating && typeof data.rating.average === 'number' && typeof data.rating.count === 'number'
            ? { average: data.rating.average, count: data.rating.count }
            : null;
        const downloads = typeof data.downloads === 'number' ? data.downloads : null;
        return { testedVersions: versions, rating, downloads };
    } catch (error) {
        console.error(`Error fetching SpigotMC resource ${resourceId}:`, error);
        return undefined;
    }
}

/**
 * Fetches listings for multiple resources with rate limiting
 * @param resourceIds SpigotMC resource ids
 * @param concurrentLimit Maximum number of concurrent requests (default: 5)
 * @returns Map of resource id to listing
 */
export async function getSpigotListingsWithRateLimit(
    resourceIds: string[],
    concurrentLimit: number = 5
): Promise<Map<string, SpigotListing | undefined>> {
    const results = new Map<string, SpigotListing | undefined>();

    for (let i = 0; i < resourceIds.length; i += concurrentLimit) {
        const batch = resourceIds.slice(i, i + concurrentLimit);
        const batchResults = await Promise.all(
            batch.map(async (id) => {
                const listing = await getSpigotListing(id);
                return { id, listing };
            })
        );
        batchResults.forEach(({ id, listing }) => {
            results.set(id, listing);
        });
    }

    return results;
}

/**
 * The rating to show, or null when it should not be: a listing with fewer
 * than MIN_REVIEWS_FOR_RATING reviews is withheld rather than shown as a
 * near-meaningless average, and a listing with no figures has nothing to
 * show. The average is rounded to one decimal, as SpigotMC displays it.
 */
export function shownRating(
    rating: { average: number; count: number } | null | undefined
): { average: number; count: number } | null {
    if (!rating || rating.count < MIN_REVIEWS_FOR_RATING) {
        return null;
    }
    return { average: Math.round(rating.average * 10) / 10, count: rating.count };
}

/** The reviews tab of a SpigotMC resource page, where the rating comes from. */
export function spigotReviewsUrl(spigotmcLink: string): string {
    return spigotmcLink.replace(/\/?$/, '/') + 'reviews';
}

type ParsedVersion = { raw: string; major: number; minor: number };

const parseVersion = (raw: string): ParsedVersion | undefined => {
    const match = /^(\d+)\.(\d+)$/.exec(raw.trim());
    return match ? { raw: raw.trim(), major: Number(match[1]), minor: Number(match[2]) } : undefined;
};

/**
 * Collapses a tested-versions list into the short label a chip can carry:
 * `["1.18", "1.19", "1.20"]` becomes "1.18–1.20", a lone entry stays as it
 * is, and a gap keeps the sides apart — `["1.16", "1.21"]` is "1.16, 1.21",
 * never "1.16–1.21", which would claim versions nobody tested. Only an
 * unbroken run of minor versions under one major collapses, so the rule
 * holds for the year-numbered releases (26.1, 26.2 …) as it does for 1.x.
 * Anything that is not major.minor is passed through untouched, in the
 * order given, so an unfamiliar spelling is shown rather than dropped.
 */
export function formatTestedVersions(versions: string[]): string {
    const parsed: ParsedVersion[] = [];
    const other: string[] = [];
    for (const raw of versions) {
        const p = parseVersion(raw);
        if (p) {
            parsed.push(p);
        } else if (raw.trim()) {
            other.push(raw.trim());
        }
    }
    parsed.sort((a, b) => a.major - b.major || a.minor - b.minor);

    const runs: string[] = [];
    let start: ParsedVersion | undefined;
    let end: ParsedVersion | undefined;
    const flush = () => {
        if (!start || !end) {
            return;
        }
        runs.push(start === end ? start.raw : `${start.raw}–${end.raw}`);
    };
    for (const v of parsed) {
        if (end && v.major === end.major && v.minor === end.minor) {
            continue; // duplicate
        }
        if (end && v.major === end.major && v.minor === end.minor + 1) {
            end = v;
            continue;
        }
        flush();
        start = v;
        end = v;
    }
    flush();

    return [...runs, ...other].join(', ');
}
