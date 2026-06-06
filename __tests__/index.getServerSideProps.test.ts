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
        pluginsWithCounts: Array<{ id: string; serverCount?: number | null }>;
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
});
