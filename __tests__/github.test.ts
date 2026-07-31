import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLatestRelease, getLatestReleasesWithRateLimit, parseGithubRepo } from '../utils/github';

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

describe('parseGithubRepo', () => {
    it('extracts owner/repo from a GitHub URL', () => {
        expect(parseGithubRepo('https://github.com/Dans-Plugins/Activity-Tracker')).toBe('Dans-Plugins/Activity-Tracker');
    });

    it('strips a trailing .git suffix', () => {
        expect(parseGithubRepo('https://github.com/Dans-Plugins/Activity-Tracker.git')).toBe('Dans-Plugins/Activity-Tracker');
    });

    it('returns undefined for a non-GitHub URL', () => {
        expect(parseGithubRepo('https://example.com/Dans-Plugins/Activity-Tracker')).toBeUndefined();
    });
});

describe('getLatestRelease', () => {
    it('returns the tag name from a well-formed response', async () => {
        stubFetch({ ok: true, json: async () => ({ tag_name: 'v1.2.3' }) });
        expect(await getLatestRelease('https://github.com/Dans-Plugins/Activity-Tracker')).toBe('v1.2.3');
    });

    it('returns undefined on a 404 (no releases) without logging an error', async () => {
        stubFetch({ ok: false, status: 404, statusText: 'Not Found' });
        expect(await getLatestRelease('https://github.com/Dans-Plugins/Activity-Tracker')).toBeUndefined();
        expect(console.error).not.toHaveBeenCalled();
    });

    it('returns undefined on a non-ok, non-404 response', async () => {
        stubFetch({ ok: false, status: 503, statusText: 'Service Unavailable' });
        expect(await getLatestRelease('https://github.com/Dans-Plugins/Activity-Tracker')).toBeUndefined();
        expect(console.error).toHaveBeenCalled();
    });

    it('returns undefined when tag_name is missing', async () => {
        stubFetch({ ok: true, json: async () => ({ unexpected: 'shape' }) });
        expect(await getLatestRelease('https://github.com/Dans-Plugins/Activity-Tracker')).toBeUndefined();
    });

    it('returns undefined when fetch rejects', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
        expect(await getLatestRelease('https://github.com/Dans-Plugins/Activity-Tracker')).toBeUndefined();
    });

    it('returns undefined for a link that is not a GitHub URL', async () => {
        vi.stubGlobal('fetch', vi.fn());
        expect(await getLatestRelease('https://example.com/foo/bar')).toBeUndefined();
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe('getLatestReleasesWithRateLimit', () => {
    it('resolves a tag for every link when batching by the concurrency limit', async () => {
        const tags: Record<string, string> = { a: 'v1.0.0', b: 'v2.0.0', c: 'v3.0.0', d: 'v4.0.0', e: 'v5.0.0' };
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
            const repo = url.split('/repos/')[1].split('/releases')[0];
            const id = repo.split('/')[1];
            return Promise.resolve({ ok: true, json: async () => ({ tag_name: tags[id] }) } as Response);
        }));

        const links = Object.keys(tags).map((id) => `https://github.com/org/${id}`);
        const result = await getLatestReleasesWithRateLimit(links, 2);

        expect(result.size).toBe(5);
        expect(result.get('https://github.com/org/a')).toBe('v1.0.0');
        expect(result.get('https://github.com/org/e')).toBe('v5.0.0');
    });

    it('returns an empty map for an empty link list', async () => {
        vi.stubGlobal('fetch', vi.fn());
        const result = await getLatestReleasesWithRateLimit([], 5);
        expect(result.size).toBe(0);
        expect(fetch).not.toHaveBeenCalled();
    });
});
