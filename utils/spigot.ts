/**
 * Which Minecraft versions a plugin has been tested on, read from its
 * SpigotMC listing through Spiget (https://spiget.org), the public JSON
 * mirror of SpigotMC's resource data.
 *
 * SpigotMC's "Tested Minecraft Versions" field is the one the author already
 * keeps up to date, so the site mirrors it the way it mirrors bStats server
 * counts rather than carrying a second, hand-maintained copy that would
 * drift. Nothing else records the range: a GitHub release payload has no
 * such field, and plugin.yml's api-version is a floor, not a tested set.
 */

/**
 * How long one Spiget request may take before it is abandoned — the same
 * bound bStats gets, for the same reason: the home page asks once per
 * plugin, and an unbounded hang there once took the whole site offline.
 */
export const SPIGOT_TIMEOUT_MS = 3_000;

/** How long a fetched list is served before Spiget is asked again. */
export const SPIGOT_CACHE_TTL_MS = 10 * 60 * 1_000;

type CacheEntry = { versions: string[] | undefined; fetchedAt: number };

// Module-level: one cache per server process. Tested versions change with a
// plugin release at most, so a ten-minute-old list is fine, and during an
// outage the last good list keeps being shown instead of nothing.
const cache = new Map<string, CacheEntry>();

/** Test hook: forget every cached list. */
export function clearTestedVersionsCache(): void {
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
 * Fetches the tested Minecraft versions for a SpigotMC resource.
 * @param resourceId The SpigotMC resource id
 * @returns The versions as SpigotMC lists them, or undefined if unavailable/error
 */
export async function getTestedVersions(resourceId: string): Promise<string[] | undefined> {
    const cached = cache.get(resourceId);
    if (cached && Date.now() - cached.fetchedAt < SPIGOT_CACHE_TTL_MS) {
        return cached.versions;
    }

    const fresh = await fetchTestedVersions(resourceId);
    if (fresh !== undefined) {
        cache.set(resourceId, { versions: fresh, fetchedAt: Date.now() });
        return fresh;
    }

    // Stale beats blank: keep showing the last good list through an outage,
    // and re-stamp it so the next render does not pay the timeout again until
    // the TTL has passed.
    if (cached) {
        cache.set(resourceId, { versions: cached.versions, fetchedAt: Date.now() });
        return cached.versions;
    }
    return undefined;
}

async function fetchTestedVersions(resourceId: string): Promise<string[] | undefined> {
    try {
        const response = await fetch(
            'https://api.spiget.org/v2/resources/' + resourceId + '?fields=testedVersions',
            { signal: AbortSignal.timeout(SPIGOT_TIMEOUT_MS) }
        );

        if (!response.ok) {
            console.error(
                `Error fetching tested versions for SpigotMC resource ${resourceId}: HTTP ${response.status} ${response.statusText}`
            );
            return undefined;
        }

        const data = await response.json();
        const versions = data?.testedVersions;
        if (!Array.isArray(versions)) {
            return undefined;
        }
        return versions.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
    } catch (error) {
        console.error(`Error fetching tested versions for SpigotMC resource ${resourceId}:`, error);
        return undefined;
    }
}

/**
 * Fetches tested versions for multiple resources with rate limiting
 * @param resourceIds SpigotMC resource ids
 * @param concurrentLimit Maximum number of concurrent requests (default: 5)
 * @returns Map of resource id to tested versions
 */
export async function getTestedVersionsWithRateLimit(
    resourceIds: string[],
    concurrentLimit: number = 5
): Promise<Map<string, string[] | undefined>> {
    const results = new Map<string, string[] | undefined>();

    for (let i = 0; i < resourceIds.length; i += concurrentLimit) {
        const batch = resourceIds.slice(i, i + concurrentLimit);
        const batchResults = await Promise.all(
            batch.map(async (id) => {
                const versions = await getTestedVersions(id);
                return { id, versions };
            })
        );
        batchResults.forEach(({ id, versions }) => {
            results.set(id, versions);
        });
    }

    return results;
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
