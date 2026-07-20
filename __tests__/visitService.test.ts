import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getVisits, incrementVisits} from '../services/visitService';

const stubFetch = (response: Partial<Response>) => {
    const fetchMock = vi.fn().mockResolvedValue(response as Response);
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
};

beforeEach(() => {
    vi.unstubAllEnvs();
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('incrementVisits', () => {
    it('POSTs to /api/visits on the default base URL', async () => {
        const fetchMock = stubFetch({ok: true});
        await incrementVisits();
        expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/visits', {method: 'POST'});
    });

    it('uses NEXT_PUBLIC_BASE_URL when set', async () => {
        vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://dansplugins.com');
        const fetchMock = stubFetch({ok: true});
        await incrementVisits();
        expect(fetchMock).toHaveBeenCalledWith('https://dansplugins.com/api/visits', {method: 'POST'});
    });
});

describe('getVisits', () => {
    it('returns the parsed visit data on a 200 response', async () => {
        const visitData = {visits: 42, startDate: '2020-01-01'};
        stubFetch({ok: true, json: async () => visitData});
        expect(await getVisits()).toEqual(visitData);
    });

    it('throws with the status and status text on a non-ok response', async () => {
        stubFetch({ok: false, status: 500, statusText: 'Internal Server Error'});
        await expect(getVisits()).rejects.toThrow('Failed to fetch visits: 500 Internal Server Error');
    });

    it('propagates a rejected fetch', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
        await expect(getVisits()).rejects.toThrow('network down');
    });
});
