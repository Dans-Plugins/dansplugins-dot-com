/**
 * Fetches the server count for a given bStatsId from the bStats API
 * @param bStatsId The bStats plugin ID
 * @returns The server count or undefined if unavailable/error
 */
export async function getServerCount(bStatsId: string): Promise<number | undefined> {
    try {
        const response = await fetch(
            'https://bstats.org/api/v1/plugins/' + bStatsId + '/charts/servers/data?maxElements=1'
        );
        
        if (!response.ok) {
            console.error(
                `Error fetching server count for bStatsId ${bStatsId}: HTTP ${response.status} ${response.statusText}`
            );
            return undefined;
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length < 1) {
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
