import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getBacklogItems, getBacklogSummary} from '../services/backlogService';

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

describe('getBacklogItems', () => {
    it('returns the items on a 200 response', async () => {
        const items = [{repo: 'Fiefs', number: 1, targetId: 'Fiefs#1'}];
        stubFetch({ok: true, json: async () => items});
        expect(await getBacklogItems()).toEqual(items);
    });

    it('scopes the request to a repo when provided', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => []} as Response);
        vi.stubGlobal('fetch', fetchMock);
        await getBacklogItems('Medieval-Factions');
        expect(fetchMock.mock.calls[0][0]).toContain('repo=Medieval-Factions');
    });

    it('returns an empty array on a non-ok response', async () => {
        stubFetch({ok: false, status: 500});
        expect(await getBacklogItems()).toEqual([]);
    });

    it('returns an empty array when fetch rejects', async () => {
        rejectFetch();
        expect(await getBacklogItems()).toEqual([]);
    });
});

describe('getBacklogSummary', () => {
    it('returns the summary rows on a 200 response', async () => {
        const summary = [{repo: 'Fiefs', openIssueCount: 1, openPrCount: 0, draftPrCount: 0, oldestOpenItemAt: null}];
        stubFetch({ok: true, json: async () => summary});
        expect(await getBacklogSummary()).toEqual(summary);
    });

    it('returns an empty array on a non-ok response', async () => {
        stubFetch({ok: false, status: 500});
        expect(await getBacklogSummary()).toEqual([]);
    });

    it('returns an empty array when fetch rejects', async () => {
        rejectFetch();
        expect(await getBacklogSummary()).toEqual([]);
    });
});
