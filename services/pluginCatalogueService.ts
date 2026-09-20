import {getApiBaseUrl} from '../utils/apiBase';

/**
 * The plugin catalogue, read from dpc-api's `plugins` table — the second
 * step RESOURCE_HUB.md planned: until now the site rendered from a
 * checked-in `pages/data/plugins.json` that duplicated the table and was
 * policed by a drift guard. The file is gone; this is the one source, and an
 * admin edits it on the site rather than by pull request or migration.
 */

/** One catalogue entry, in the shape the pages were written against. */
export interface CataloguePlugin {
    // The slug: the id every guide URL, resource URL and like target keys off.
    id: string;
    title: string;
    description: string;
    githubLink: string;
    // Null for a plugin with no SpigotMC page, no bStats project, or no icon.
    spigotmcLink: string | null;
    bStatsId: string | null;
    icon: string | null;
    tags: string[];
}

/** How long a fetched catalogue is served before dpc-api is asked again. */
export const CATALOGUE_CACHE_TTL_MS = 5 * 60 * 1_000;

/** How long one catalogue request may take before it is abandoned. */
export const CATALOGUE_TIMEOUT_MS = 5_000;

type CacheEntry = {plugins: CataloguePlugin[]; fetchedAt: number};

// Module-level: one cache per server process. The catalogue is the one
// upstream every page needs, so an outage must not blank the site: the last
// good catalogue keeps being served, and only a process that has never
// reached the API at all has nothing to show.
let cache: CacheEntry | null = null;

/** Test hook: forget the cached catalogue. */
export const clearCatalogueCache = (): void => {
    cache = null;
};

const orNull = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() !== '' ? value : null;

/** dpc-api's row shape → the page shape. Exported for the client-side readers. */
export const toCataloguePlugin = (row: unknown): CataloguePlugin | null => {
    if (!row || typeof row !== 'object') {
        return null;
    }
    const r = row as Record<string, unknown>;
    if (typeof r.slug !== 'string' || typeof r.title !== 'string' || typeof r.githubUrl !== 'string') {
        return null;
    }
    return {
        id: r.slug,
        title: r.title,
        description: typeof r.description === 'string' ? r.description : '',
        githubLink: r.githubUrl,
        spigotmcLink: orNull(r.spigotmcUrl),
        bStatsId: orNull(r.bstatsId),
        icon: orNull(r.iconPath),
        tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : [],
    };
};

const fetchCatalogue = async (): Promise<CataloguePlugin[] | undefined> => {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/v1/plugins`, {signal: AbortSignal.timeout(CATALOGUE_TIMEOUT_MS)});
        if (!res.ok) {
            console.error(`Error fetching the plugin catalogue: HTTP ${res.status} ${res.statusText}`);
            return undefined;
        }
        const rows = await res.json();
        if (!Array.isArray(rows)) {
            console.error('Error fetching the plugin catalogue: response body was not an array.');
            return undefined;
        }
        return rows.map(toCataloguePlugin).filter((p): p is CataloguePlugin => p !== null);
    } catch (error) {
        console.error('Error fetching the plugin catalogue:', error);
        return undefined;
    }
};

/**
 * The whole catalogue, alphabetical by title as the API serves it. Server
 * side. Resolves to the last good catalogue through an outage, and to an
 * empty list only when this process has never reached the API — a page must
 * treat that as "unavailable", not as "no plugins".
 */
export const getCatalogue = async (): Promise<CataloguePlugin[]> => {
    if (cache && Date.now() - cache.fetchedAt < CATALOGUE_CACHE_TTL_MS) {
        return cache.plugins;
    }
    const fresh = await fetchCatalogue();
    if (fresh !== undefined) {
        cache = {plugins: fresh, fetchedAt: Date.now()};
        return fresh;
    }
    if (cache) {
        // Stale beats blank; re-stamp so the next render is not another timeout.
        cache = {plugins: cache.plugins, fetchedAt: Date.now()};
        return cache.plugins;
    }
    return [];
};

/** One catalogue entry by slug, or null. Served from the same cache. */
export const getCataloguePlugin = async (slug: string): Promise<CataloguePlugin | null> =>
    (await getCatalogue()).find((plugin) => plugin.id === slug) ?? null;

/**
 * The catalogue for a page that renders in the browser (the account and
 * profile pages resolve liked items against it). Uncached: a browser holds
 * one page at a time, and the API answers from a sixteen-row table.
 */
export const fetchCatalogueInBrowser = async (): Promise<CataloguePlugin[]> => {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/v1/plugins`);
        if (!res.ok) {
            return [];
        }
        const rows = await res.json();
        return Array.isArray(rows) ? rows.map(toCataloguePlugin).filter((p): p is CataloguePlugin => p !== null) : [];
    } catch {
        return [];
    }
};
