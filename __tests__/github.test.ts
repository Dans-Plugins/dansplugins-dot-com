import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getLatestRelease, parseGithubRepo, releasesUrl } from '../utils/github';

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

describe('releasesUrl', () => {
    it('points at the repository\'s releases page', () => {
        expect(releasesUrl('https://github.com/Dans-Plugins/Activity-Tracker'))
            .toBe('https://github.com/Dans-Plugins/Activity-Tracker/releases');
    });

    it('normalises a trailing slash rather than doubling it', () => {
        expect(releasesUrl('https://github.com/Dans-Plugins/Fiefs/'))
            .toBe('https://github.com/Dans-Plugins/Fiefs/releases');
    });

    it('returns undefined for a non-GitHub URL, so callers can omit the download link', () => {
        expect(releasesUrl('https://example.com/not/a/repo')).toBeUndefined();
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
