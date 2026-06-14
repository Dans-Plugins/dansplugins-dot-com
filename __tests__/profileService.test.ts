import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getPublicProfile} from '../services/profileService';

// Minimal fetch Response stub for the public-profile endpoint.
const stubFetch = (response: Partial<Response>) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response as Response));
};

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('getPublicProfile', () => {
    it('returns the parsed profile on a 200 response', async () => {
        const profile = {
            username: 'alice',
            displayName: 'Alice',
            avatarUrl: null,
            bio: null,
            createdAt: '2026-01-01T00:00:00Z',
            badges: ['SERVER_OWNER'],
            likes: [],
        };
        stubFetch({ok: true, json: async () => profile});
        expect(await getPublicProfile('alice')).toEqual(profile);
    });

    it('returns null on a 404 (unknown user)', async () => {
        stubFetch({ok: false, status: 404});
        expect(await getPublicProfile('nobody')).toBeNull();
    });

    it('returns null when fetch rejects', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
        expect(await getPublicProfile('alice')).toBeNull();
    });

    it('URL-encodes the username in the request path', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => ({})} as Response);
        vi.stubGlobal('fetch', fetchMock);
        await getPublicProfile('a b/c');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/profile/a%20b%2Fc');
    });
});
