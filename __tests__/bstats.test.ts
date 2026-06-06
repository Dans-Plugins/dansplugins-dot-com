import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getServerCount, getServerCountsWithRateLimit } from '../utils/bstats';

// Build a minimal fetch Response stub for the bStats charts endpoint.
const stubFetch = (response: Partial<Response>) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response as Response));
};

beforeEach(() => {
    // The implementation logs errors on bad responses; keep test output quiet.
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('getServerCount', () => {
    it('returns the server count from a well-formed response', async () => {
        stubFetch({ ok: true, json: async () => [[1610000000000, 1234]] });
        expect(await getServerCount('1')).toBe(1234);
    });

    it('returns undefined on a non-ok response', async () => {
        stubFetch({ ok: false, status: 503, statusText: 'Service Unavailable' });
        expect(await getServerCount('1')).toBeUndefined();
    });

    it('returns undefined when the payload is not an array', async () => {
        stubFetch({ ok: true, json: async () => ({ unexpected: 'shape' }) });
        expect(await getServerCount('1')).toBeUndefined();
    });

    it('returns undefined when the first element is malformed', async () => {
        stubFetch({ ok: true, json: async () => [[1610000000000]] });
        expect(await getServerCount('1')).toBeUndefined();
    });

    it('returns undefined when the count is not a number', async () => {
        stubFetch({ ok: true, json: async () => [[1610000000000, 'not-a-number']] });
        expect(await getServerCount('1')).toBeUndefined();
    });

    it('returns undefined when fetch rejects', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
        expect(await getServerCount('1')).toBeUndefined();
    });
});

describe('getServerCountsWithRateLimit', () => {
    it('resolves a count for every id when batching by the concurrency limit', async () => {
        const counts: Record<string, number> = { a: 1, b: 2, c: 3, d: 4, e: 5 };
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
            const id = url.split('/plugins/')[1].split('/')[0];
            return Promise.resolve({ ok: true, json: async () => [[0, counts[id]]] } as Response);
        }));

        const result = await getServerCountsWithRateLimit(['a', 'b', 'c', 'd', 'e'], 2);

        expect(result.size).toBe(5);
        expect(result.get('a')).toBe(1);
        expect(result.get('e')).toBe(5);
    });

    it('returns an empty map for an empty id list', async () => {
        vi.stubGlobal('fetch', vi.fn());
        const result = await getServerCountsWithRateLimit([], 5);
        expect(result.size).toBe(0);
        expect(fetch).not.toHaveBeenCalled();
    });
});
