import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {convertFeatureRequest, createFeatureRequest, getFeatureRequests} from '../services/featureRequestService';

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

describe('getFeatureRequests', () => {
    it('returns the requests on a 200 response', async () => {
        const requests = [{id: '1', repo: 'Fiefs', title: 'Add X', description: 'Because Y',
            authorUsername: 'alice', status: 'OPEN', convertedIssueUrl: null, createdAt: '2026-01-01T00:00:00Z'}];
        stubFetch({ok: true, json: async () => requests});
        expect(await getFeatureRequests()).toEqual(requests);
    });

    it('scopes the request to a repo when provided', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => []} as Response);
        vi.stubGlobal('fetch', fetchMock);
        await getFeatureRequests('Fiefs');
        expect(fetchMock.mock.calls[0][0]).toContain('repo=Fiefs');
    });

    it('returns an empty array on a non-ok response', async () => {
        stubFetch({ok: false, status: 500});
        expect(await getFeatureRequests()).toEqual([]);
    });

    it('returns an empty array when fetch rejects', async () => {
        rejectFetch();
        expect(await getFeatureRequests()).toEqual([]);
    });
});

describe('createFeatureRequest', () => {
    it('resolves ok:true with the created request', async () => {
        const request = {id: '1', repo: 'Fiefs', title: 'Add X', description: 'Because Y',
            authorUsername: 'alice', status: 'OPEN', convertedIssueUrl: null, createdAt: '2026-01-01T00:00:00Z'};
        stubFetch({ok: true, json: async () => request});
        expect(await createFeatureRequest('token', 'Fiefs', 'Add X', 'Because Y')).toEqual({ok: true, value: request});
    });

    it('resolves ok:false with the server detail message on validation failure', async () => {
        stubFetch({ok: false, status: 400, json: async () => ({detail: 'title is required'})});
        expect(await createFeatureRequest('token', 'Fiefs', '', 'Because Y'))
            .toEqual({ok: false, message: 'title is required'});
    });

    it('resolves ok:false when fetch rejects', async () => {
        rejectFetch();
        expect(await createFeatureRequest('token', 'Fiefs', 'Add X', 'Because Y'))
            .toEqual({ok: false, message: 'Network error — please try again.'});
    });
});

describe('convertFeatureRequest', () => {
    it('resolves ok:true with the converted request', async () => {
        const request = {id: '1', repo: 'Fiefs', title: 'Add X', description: 'Because Y',
            authorUsername: 'alice', status: 'CONVERTED', convertedIssueUrl: 'https://github.com/x', createdAt: '2026-01-01T00:00:00Z'};
        stubFetch({ok: true, json: async () => request});
        expect(await convertFeatureRequest('token', '1')).toEqual({ok: true, value: request});
    });

    it('resolves ok:false with a generic message when the error body is not JSON', async () => {
        stubFetch({ok: false, status: 403, json: async () => { throw new Error('not json'); }});
        expect(await convertFeatureRequest('token', '1')).toEqual({ok: false, message: 'Request failed (HTTP 403)'});
    });
});
