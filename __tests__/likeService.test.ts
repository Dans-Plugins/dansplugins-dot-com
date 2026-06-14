import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getLikeCounts, getMyLikes, likeTarget, unlikeTarget} from '../services/likeService';

const stubFetch = (response: Partial<Response>) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response as Response));
};

const rejectFetch = () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
};

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('getLikeCounts', () => {
    it('returns the counts map on a 200 response', async () => {
        stubFetch({ok: true, json: async () => ({mf: 3, fiefs: 1})});
        expect(await getLikeCounts('plugin')).toEqual({mf: 3, fiefs: 1});
    });

    it('returns an empty map on a non-ok response', async () => {
        stubFetch({ok: false, status: 500});
        expect(await getLikeCounts('plugin')).toEqual({});
    });

    it('returns an empty map when fetch rejects', async () => {
        rejectFetch();
        expect(await getLikeCounts('plugin')).toEqual({});
    });
});

describe('getMyLikes', () => {
    it('returns the liked targets on a 200 response', async () => {
        const likes = [{targetType: 'plugin', targetId: 'mf'}];
        stubFetch({ok: true, json: async () => likes});
        expect(await getMyLikes('token')).toEqual(likes);
    });

    it('sends the bearer token', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => []} as Response);
        vi.stubGlobal('fetch', fetchMock);
        await getMyLikes('my-token');
        expect(fetchMock.mock.calls[0][1]).toMatchObject({headers: {Authorization: 'Bearer my-token'}});
    });

    it('returns an empty array on a non-ok response', async () => {
        stubFetch({ok: false, status: 401});
        expect(await getMyLikes('token')).toEqual([]);
    });

    it('returns an empty array when fetch rejects', async () => {
        rejectFetch();
        expect(await getMyLikes('token')).toEqual([]);
    });
});

describe('likeTarget / unlikeTarget', () => {
    it('resolves to the new count from the response', async () => {
        stubFetch({ok: true, json: async () => ({count: 5})});
        expect(await likeTarget('token', 'plugin', 'mf')).toBe(5);
    });

    it('returns null on a non-ok response', async () => {
        stubFetch({ok: false, status: 400});
        expect(await likeTarget('token', 'plugin', 'mf')).toBeNull();
    });

    it('returns null when the response omits a numeric count', async () => {
        stubFetch({ok: true, json: async () => ({})});
        expect(await unlikeTarget('token', 'plugin', 'mf')).toBeNull();
    });

    it('returns null when fetch rejects', async () => {
        rejectFetch();
        expect(await unlikeTarget('token', 'plugin', 'mf')).toBeNull();
    });
});
