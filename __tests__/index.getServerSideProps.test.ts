import {beforeEach, describe, expect, it, vi} from 'vitest';

// The home page calls the visits API in getServerSideProps; mock it so the
// test exercises only the plugin/server-count serialization path.
vi.mock('../services/visitService', () => ({
    incrementVisits: vi.fn().mockResolvedValue(undefined),
    getVisits: vi.fn().mockResolvedValue({visits: 0, startDate: '2020-01-01T00:00:00.000Z'})
}));

import {getServerSideProps} from '../pages/index';
import {clearSpigotListingCache} from '../utils/spigot';
import {clearCatalogueCache} from '../services/pluginCatalogueService';
import {API_CATALOGUE, catalogueResponse} from './fixtures/catalogue';

interface HomePropsShape {
    props: {
        visits: number | null;
        startDate: string | null;
        pluginsWithCounts: Array<{
            id: string;
            serverCount?: number | null;
            latestVersion?: string | null;
            latestDownloadUrl?: string | null;
            spigotmcLink?: string | null;
            bStatsId?: string | null;
            icon?: string | null;
            tags?: string[];
            testedVersions?: string[] | null;
            spigotRating?: {average: number; count: number} | null;
        }>;
    };
}

beforeEach(() => {
    // Tested versions are cached across renders (utils/spigot.ts); start each
    // test from an empty cache or a list leaks from the previous one.
    clearSpigotListingCache();
    clearCatalogueCache();
    // The catalogue answers; every other upstream (bStats, Spiget, the release
    // mirror) is unreachable, so every figure resolves to undefined inside its
    // helper — the worst case for serialization.
    vi.stubGlobal('fetch', catalogueOnly());
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

// A fetch that serves the catalogue fixture and rejects everything else, or
// hands the rest to `others` when a test wants one more upstream to answer.
const catalogueOnly = (others?: (url: string) => Promise<Response>) =>
    vi.fn((url: string) => /\/api\/v1\/plugins$/.test(url)
        ? Promise.resolve(catalogueResponse())
        : others ? others(url) : Promise.reject(new Error('upstream unreachable')));

describe('home getServerSideProps catalogue', () => {
    it('renders the plugins the API serves, title-sorted as the API orders them', async () => {
        const result = await getServerSideProps() as HomePropsShape;
        expect(result.props.pluginsWithCounts.map((p) => p.id)).toEqual(API_CATALOGUE.map((p) => p.slug));
        const cookery = result.props.pluginsWithCounts.find((p) => p.id === 'medieval-cookery');
        // The API's nulls come through as nulls, never undefined.
        expect(cookery).toMatchObject({spigotmcLink: null, bStatsId: null, icon: null, tags: ['medieval', 'recipes', 'roleplay']});
    });

    it('serves an empty catalogue, which the page shows as unavailable, when the API has never answered', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('api unreachable')));
        const result = await getServerSideProps() as HomePropsShape;
        expect(result.props.pluginsWithCounts).toEqual([]);
    });

    it('keeps serving the last good catalogue through an outage', async () => {
        await getServerSideProps();
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('api unreachable')));
        const result = await getServerSideProps() as HomePropsShape;
        expect(result.props.pluginsWithCounts.map((p) => p.id)).toEqual(API_CATALOGUE.map((p) => p.slug));
    });
});

describe('home getServerSideProps serialization', () => {
    it('never returns an undefined serverCount (Next.js cannot serialize undefined)', async () => {
        const result = await getServerSideProps() as HomePropsShape;
        const undefinedCounts = result.props.pluginsWithCounts.filter((p) => p.serverCount === undefined);
        expect(undefinedCounts).toEqual([]);
    });

    it('never returns an undefined testedVersions, and null for a plugin with no SpigotMC page', async () => {
        const result = await getServerSideProps() as HomePropsShape;
        expect(result.props.pluginsWithCounts.filter((p) => p.testedVersions === undefined)).toEqual([]);
        const cookery = result.props.pluginsWithCounts.find((p) => p.id === 'medieval-cookery');
        expect(cookery?.testedVersions).toBeNull();
    });

    it('labels each card with the versions Spiget lists for its SpigotMC resource', async () => {
        vi.stubGlobal('fetch', catalogueOnly((url: string) => {
            if (url.includes('api.spiget.org/v2/resources/79941?')) {
                return Promise.resolve({ok: true, json: async () => ({testedVersions: ['1.21'], rating: {count: 45, average: 4.7}, downloads: 63788})} as Response);
            }
            return Promise.reject(new Error('upstream unreachable'));
        }));

        const result = await getServerSideProps() as HomePropsShape;

        const mf = result.props.pluginsWithCounts.find((p) => p.id === 'medieval-factions');
        expect(mf?.testedVersions).toEqual(['1.21']);
        expect(mf?.spigotRating).toEqual({average: 4.7, count: 45});
        const fiefs = result.props.pluginsWithCounts.find((p) => p.id === 'fiefs');
        expect(fiefs?.testedVersions).toBeNull();
        expect(fiefs?.spigotRating).toBeNull();
    });

    it('uses null for a plugin that has no bStatsId', async () => {
        const result = await getServerSideProps() as HomePropsShape;
        const cookery = result.props.pluginsWithCounts.find((p) => p.id === 'medieval-cookery');
        expect(cookery).toBeDefined();
        expect(cookery?.serverCount).toBeNull();
    });

    it('uses null for a plugin the release mirror named no tag for', async () => {
        const result = await getServerSideProps() as HomePropsShape;
        const undefinedVersions = result.props.pluginsWithCounts.filter((p) => p.latestVersion === undefined);
        expect(undefinedVersions).toEqual([]);
    });

    it('uses null for a plugin the release mirror offered no jar for', async () => {
        const result = await getServerSideProps() as HomePropsShape;
        const undefinedUrls = result.props.pluginsWithCounts.filter((p) => p.latestDownloadUrl === undefined);
        expect(undefinedUrls).toEqual([]);
    });
});

describe('home getServerSideProps release tags', () => {
    it('labels each card with the tag the mirror gives for its slug', async () => {
        vi.stubGlobal('fetch', catalogueOnly((url: string) => {
            if (url.includes('/api/v1/plugins/versions/latest')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => [
                        {slug: 'fiefs', tag: 'v1.2.0', prerelease: false, publishedAt: '2026-01-01T00:00:00Z',
                            downloadUrl: 'https://github.com/Dans-Plugins/Fiefs/releases/download/v1.2.0/Fiefs-1.2.0.jar'}
                    ]
                } as Response);
            }
            return Promise.reject(new Error('bstats unreachable'));
        }));

        const result = await getServerSideProps() as HomePropsShape;

        const fiefs = result.props.pluginsWithCounts.find((p) => p.id === 'fiefs');
        expect(fiefs?.latestVersion).toBe('v1.2.0');
        expect(fiefs?.latestDownloadUrl).toBe('https://github.com/Dans-Plugins/Fiefs/releases/download/v1.2.0/Fiefs-1.2.0.jar');
        const currencies = result.props.pluginsWithCounts.find((p) => p.id === 'currencies');
        expect(currencies?.latestVersion).toBeNull();
        expect(currencies?.latestDownloadUrl).toBeNull();
    });

    it('never calls GitHub, however many plugins the catalogue holds', async () => {
        // The whole point of reading the mirror: a call per plugin per render
        // does not fit GitHub's unauthenticated hourly rate limit.
        const fetchMock = catalogueOnly(() => Promise.resolve({ok: true, json: async () => []} as Response));
        vi.stubGlobal('fetch', fetchMock);

        await getServerSideProps();

        expect(fetchMock.mock.calls.some(([url]) => (url as string).includes('api.github.com'))).toBe(false);
    });
});
