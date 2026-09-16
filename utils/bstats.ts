/**
 * How long one bStats request may take before it is abandoned. bStats sits
 * behind Cloudflare; when its origin is down every request hangs for the
 * full Cloudflare 522 wait (~15 s), and the home page awaits sixteen of them.
 * Without a bound that made `/` take close to a minute, which failed the
 * container health check and took the whole site offline (2026-09-16).
 */
export const BSTATS_TIMEOUT_MS = 3_000;

/** How long a fetched count is served before bStats is asked again. */
export const BSTATS_CACHE_TTL_MS = 10 * 60 * 1_000;

type CacheEntry = { count: number | undefined; fetchedAt: number };

// Module-level: one cache per server process. Server counts change slowly
// and are decorative, so a ten-minute-old figure is fine, and during an
// outage the last good figure keeps being shown instead of nothing.
const cache = new Map<string, CacheEntry>();

/** Test hook: forget every cached count. */
export function clearServerCountCache(): void {
    cache.clear();
}

/**
 * Fetches the server count for a given bStatsId from the bStats API
 * @param bStatsId The bStats plugin ID
 * @returns The server count or undefined if unavailable/error
 */
export async function getServerCount(bStatsId: string): Promise<number | undefined> {
    const cached = cache.get(bStatsId);
    if (cached && Date.now() - cached.fetchedAt < BSTATS_CACHE_TTL_MS) {
        return cached.count;
    }

    const fresh = await fetchServerCount(bStatsId);
    if (fresh !== undefined) {
        cache.set(bStatsId, { count: fresh, fetchedAt: Date.now() });
        return fresh;
    }

    // Stale beats blank: keep showing the last good figure through an outage.
    // Re-stamp it so the next render does not pay the timeout again until the
    // TTL has passed.
    if (cached) {
        cache.set(bStatsId, { count: cached.count, fetchedAt: Date.now() });
        return cached.count;
    }
    return undefined;
}

async function fetchServerCount(bStatsId: string): Promise<number | undefined> {
    try {
        const response = await fetch(
            'https://bstats.org/api/v1/plugins/' + bStatsId + '/charts/servers/data?maxElements=1',
            { signal: AbortSignal.timeout(BSTATS_TIMEOUT_MS) }
        );
        
        if (!response.ok) {
            console.error(
                `Error fetching server count for bStatsId ${bStatsId}: HTTP ${response.status} ${response.statusText}`
            );
            return undefined;
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            return undefined;
        }
        
        const firstElement = data[0];
        if (!Array.isArray(firstElement) || firstElement.length < 2) {
            return undefined;
        }
        
        const serverCount = firstElement[1];
        if (typeof serverCount !== 'number') {
            return undefined;
        }
        
        return serverCount;
    } catch (error) {
        console.error(`Error fetching server count for bStatsId ${bStatsId}:`, error);
        return undefined;
    }
}

/**
 * Fetches server counts for multiple plugins with rate limiting
 * @param bStatsIds Array of bStats plugin IDs
 * @param concurrentLimit Maximum number of concurrent requests (default: 5)
 * @returns Map of bStatsId to server count
 */
export async function getServerCountsWithRateLimit(
    bStatsIds: string[],
    concurrentLimit: number = 5
): Promise<Map<string, number | undefined>> {
    const results = new Map<string, number | undefined>();
    
    // Process requests in batches
    for (let i = 0; i < bStatsIds.length; i += concurrentLimit) {
        const batch = bStatsIds.slice(i, i + concurrentLimit);
        const batchResults = await Promise.all(
            batch.map(async (id) => {
                const count = await getServerCount(id);
                return { id, count };
            })
        );
        
        batchResults.forEach(({ id, count }) => {
            results.set(id, count);
        });
    }
    
    return results;
}
