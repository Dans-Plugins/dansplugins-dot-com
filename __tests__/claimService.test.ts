import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {claimItem, getActiveClaims, getMyClaims, releaseItem} from '../services/claimService';

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

describe('getActiveClaims', () => {
    it('returns the claims on a 200 response', async () => {
        const claims = [{repo: 'Fiefs', number: 136, targetId: 'Fiefs#136', claimantUsername: 'alice', claimedAt: '2026-01-01T00:00:00Z'}];
        stubFetch({ok: true, json: async () => claims});
        expect(await getActiveClaims()).toEqual(claims);
    });

    it('returns an empty array on a non-ok response', async () => {
        stubFetch({ok: false, status: 500});
        expect(await getActiveClaims()).toEqual([]);
    });

    it('returns an empty array when fetch rejects', async () => {
        rejectFetch();
        expect(await getActiveClaims()).toEqual([]);
    });
});

describe('getMyClaims', () => {
    it('sends the bearer token', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => []} as Response);
        vi.stubGlobal('fetch', fetchMock);
        await getMyClaims('my-token');
        expect(fetchMock.mock.calls[0][1]).toMatchObject({headers: {Authorization: 'Bearer my-token'}});
    });

    it('returns an empty array on a non-ok response', async () => {
        stubFetch({ok: false, status: 401});
        expect(await getMyClaims('token')).toEqual([]);
    });
});

describe('claimItem / releaseItem', () => {
    it('resolves ok:true with the claim on a successful claim', async () => {
        const claim = {repo: 'Fiefs', number: 136, targetId: 'Fiefs#136', claimantUsername: 'alice', claimedAt: '2026-01-01T00:00:00Z'};
        stubFetch({ok: true, json: async () => claim});
        expect(await claimItem('token', 'Fiefs', 136)).toEqual({ok: true, claim});
    });

    it('resolves ok:true with no claim on a successful release', async () => {
        stubFetch({ok: true, status: 204});
        expect(await releaseItem('token', 'Fiefs', 136)).toEqual({ok: true});
    });

    it('resolves ok:false with the server detail message on conflict', async () => {
        stubFetch({ok: false, status: 409, json: async () => ({detail: 'Already claimed by bob'})});
        expect(await claimItem('token', 'Fiefs', 136)).toEqual({ok: false, message: 'Already claimed by bob'});
    });

    it('resolves ok:false with a generic message when the error body is not JSON', async () => {
        stubFetch({ok: false, status: 500, json: async () => { throw new Error('not json'); }});
        expect(await claimItem('token', 'Fiefs', 136)).toEqual({ok: false, message: 'Request failed (HTTP 500)'});
    });

    it('resolves ok:false when fetch rejects', async () => {
        rejectFetch();
        expect(await claimItem('token', 'Fiefs', 136)).toEqual({ok: false, message: 'Network error — please try again.'});
    });
});
