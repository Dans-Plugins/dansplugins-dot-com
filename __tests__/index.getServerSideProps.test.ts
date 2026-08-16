import {beforeEach, describe, expect, it, vi} from 'vitest';

// The home page calls the visits API in getServerSideProps; mock it so the
// test exercises only the plugin/server-count serialization path.
vi.mock('../services/visitService', () => ({
    incrementVisits: vi.fn().mockResolvedValue(undefined),
    getVisits: vi.fn().mockResolvedValue({visits: 0, startDate: '2020-01-01T00:00:00.000Z'})
}));

import {getServerSideProps} from '../pages/index';

interface HomePropsShape {
    props: {
        visits: number | null;
        startDate: string | null;
        pluginsWithCounts: Array<{ id: string; serverCount?: number | null; latestVersion?: string | null }>;
    };
}

beforeEach(() => {
    // Simulate bStats being unreachable so every server-count lookup resolves
    // to undefined inside getServerCount — the worst case for serialization.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('bstats unreachable')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('home getServerSideProps serialization', () => {
    it('never returns an undefined serverCount (Next.js cannot serialize undefined)', async () => {
        const result = await getServerSideProps() as HomePropsShape;
        const undefinedCounts = result.props.pluginsWithCounts.filter((p) => p.serverCount === undefined);
        expect(undefinedCounts).toEqual([]);
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
});

describe('home getServerSideProps release tags', () => {
    it('labels each card with the tag the mirror gives for its slug', async () => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
            if (url.includes('/api/v1/plugins/versions/latest')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => [
                        {slug: 'fiefs', tag: 'v1.2.0', prerelease: false, publishedAt: '2026-01-01T00:00:00Z'}
                    ]
                } as Response);
            }
            return Promise.reject(new Error('bstats unreachable'));
        }));

        const result = await getServerSideProps() as HomePropsShape;

        const fiefs = result.props.pluginsWithCounts.find((p) => p.id === 'fiefs');
        expect(fiefs?.latestVersion).toBe('v1.2.0');
        const currencies = result.props.pluginsWithCounts.find((p) => p.id === 'currencies');
        expect(currencies?.latestVersion).toBeNull();
    });

    it('never calls GitHub, however many plugins the catalogue holds', async () => {
        // The whole point of reading the mirror: a call per plugin per render
        // does not fit GitHub's unauthenticated hourly rate limit.
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => []} as Response);
        vi.stubGlobal('fetch', fetchMock);

        await getServerSideProps();

        expect(fetchMock.mock.calls.some(([url]) => (url as string).includes('api.github.com'))).toBe(false);
    });
});
