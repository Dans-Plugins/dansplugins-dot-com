import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    CATALOGUE_CACHE_TTL_MS,
    clearCatalogueCache,
    fetchCatalogueInBrowser,
    getCatalogue,
    getCataloguePlugin,
    toCataloguePlugin
} from '../services/pluginCatalogueService';
import {API_CATALOGUE, catalogueResponse} from './fixtures/catalogue';

beforeEach(() => {
    clearCatalogueCache();
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('toCataloguePlugin', () => {
    it('maps the API row to the page shape, nulls and all', () => {
        expect(toCataloguePlugin(API_CATALOGUE[4])).toEqual({
            id: 'medieval-cookery', title: 'Medieval Cookery',
            description: 'Allows server owners to add cooking recipes for an enhanced roleplay experience.',
            githubLink: 'https://github.com/Dans-Plugins/Medieval-Cookery',
            spigotmcLink: null, bStatsId: null, icon: null, tags: ['medieval', 'recipes', 'roleplay']
        });
    });

    it('treats "" as null, so the old catalogue file\'s spelling of "none" still reads as none', () => {
        expect(toCataloguePlugin({slug: 'x', title: 'X', githubUrl: 'https://github.com/o/x', spigotmcUrl: '', bstatsId: ' ', iconPath: ''}))
            .toMatchObject({spigotmcLink: null, bStatsId: null, icon: null, tags: [], description: ''});
    });

    it('rejects a row without the three fields every link depends on', () => {
        expect(toCataloguePlugin({title: 'X', githubUrl: 'https://github.com/o/x'})).toBeNull();
        expect(toCataloguePlugin(null)).toBeNull();
        expect(toCataloguePlugin('nope')).toBeNull();
    });
});

describe('getCatalogue', () => {
    it('reads the catalogue once and serves it from cache inside the TTL', async () => {
        const fetchMock = vi.fn().mockResolvedValue(catalogueResponse());
        vi.stubGlobal('fetch', fetchMock);
        expect((await getCatalogue()).map((p) => p.id)).toEqual(API_CATALOGUE.map((p) => p.slug));
        await getCatalogue();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/plugins$/);
        expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('is empty, not an error, when the API has never answered', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
        expect(await getCatalogue()).toEqual([]);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 503, statusText: 'Service Unavailable'}));
        expect(await getCatalogue()).toEqual([]);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async () => ({not: 'an array'})}));
        expect(await getCatalogue()).toEqual([]);
    });

    it('keeps the last good catalogue through an outage after the TTL, without paying the timeout twice', async () => {
        vi.useFakeTimers();
        try {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue(catalogueResponse()));
            expect(await getCatalogue()).toHaveLength(API_CATALOGUE.length);
            vi.advanceTimersByTime(CATALOGUE_CACHE_TTL_MS + 1);
            const failing = vi.fn().mockRejectedValue(new Error('down'));
            vi.stubGlobal('fetch', failing);
            expect(await getCatalogue()).toHaveLength(API_CATALOGUE.length);
            expect(await getCatalogue()).toHaveLength(API_CATALOGUE.length);
            expect(failing).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });

    it('drops malformed rows rather than failing the whole catalogue', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async () => [API_CATALOGUE[0], {junk: true}]}));
        expect((await getCatalogue()).map((p) => p.id)).toEqual(['activity-tracker']);
    });
});

describe('getCataloguePlugin', () => {
    it('finds a plugin by slug from the same cache, and is null for an unknown one', async () => {
        const fetchMock = vi.fn().mockResolvedValue(catalogueResponse());
        vi.stubGlobal('fetch', fetchMock);
        expect((await getCataloguePlugin('fiefs'))?.title).toBe('Fiefs');
        expect(await getCataloguePlugin('nope')).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});

describe('fetchCatalogueInBrowser', () => {
    it('reads the catalogue without caching, and is empty on any failure', async () => {
        const fetchMock = vi.fn().mockResolvedValue(catalogueResponse());
        vi.stubGlobal('fetch', fetchMock);
        expect(await fetchCatalogueInBrowser()).toHaveLength(API_CATALOGUE.length);
        expect(await fetchCatalogueInBrowser()).toHaveLength(API_CATALOGUE.length);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
        expect(await fetchCatalogueInBrowser()).toEqual([]);
    });
});
