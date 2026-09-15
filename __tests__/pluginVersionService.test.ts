import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    getLatestVersionsBySlug,
    downloadsLabel,
    getPluginDownloads,
    getPluginVersions,
    latestStableTag,
    siteDownloadUrl,
    totalDownloads,
    PluginVersion,
} from '../services/pluginVersionService';

const version = (overrides: Partial<PluginVersion> = {}): PluginVersion => ({
    tag: 'v1.0.0',
    name: 'Fiefs 1.0.0',
    changelog: 'First release.',
    htmlUrl: 'https://github.com/Dans-Plugins/Fiefs/releases/tag/v1.0.0',
    prerelease: false,
    publishedAt: '2026-01-01T00:00:00Z',
    downloadCount: 12,
    siteDownloadCount: 0,
    assets: [],
    ...overrides,
});

const stubFetch = (response: Partial<Response>) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response as Response));
};

beforeEach(() => {
    // getLatestVersionsBySlug logs its failures; keep test output quiet.
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('getPluginVersions', () => {
    it('returns the mirrored releases on a 200 response', async () => {
        const versions = [version()];
        stubFetch({ok: true, json: async () => versions});
        expect(await getPluginVersions('fiefs')).toEqual(versions);
    });

    it('requests the versions endpoint for the given slug', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => []} as Response);
        vi.stubGlobal('fetch', fetchMock);

        await getPluginVersions('medieval-factions');

        expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/plugins/medieval-factions/versions');
    });

    it('encodes the slug as a single path segment', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => []} as Response);
        vi.stubGlobal('fetch', fetchMock);

        await getPluginVersions('not/a/slug');

        // A slug is never anything but a plain id today; encoding is what keeps
        // that true of the request even if one ever isn't.
        expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/plugins/not%2Fa%2Fslug/versions');
    });

    it('returns an empty list on a non-ok response', async () => {
        stubFetch({ok: false, status: 404});
        expect(await getPluginVersions('unknown-plugin')).toEqual([]);
    });

    it('returns an empty list when the API cannot be reached', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unreachable')));
        expect(await getPluginVersions('fiefs')).toEqual([]);
    });

    it('returns an empty list when the body is not an array', async () => {
        // A page that spreads this straight into props must not be handed an
        // object it will try to map over.
        stubFetch({ok: true, json: async () => ({error: 'nope'})});
        expect(await getPluginVersions('fiefs')).toEqual([]);
    });

    it('returns an empty list when the body is not JSON at all', async () => {
        stubFetch({
            ok: true, json: async () => {
                throw new SyntaxError('Unexpected token < in JSON');
            },
        });
        expect(await getPluginVersions('fiefs')).toEqual([]);
    });
});

describe('getLatestVersionsBySlug', () => {
    it('keys the tags and jar links by catalogue slug', async () => {
        stubFetch({
            ok: true, json: async () => [
                {slug: 'fiefs', tag: 'v1.2.0', prerelease: false, publishedAt: '2026-01-01T00:00:00Z',
                    downloadUrl: 'https://github.com/Dans-Plugins/Fiefs/releases/download/v1.2.0/Fiefs-1.2.0.jar'},
                {slug: 'medieval-factions', tag: 'v5.3.0', prerelease: false, publishedAt: '2026-02-01T00:00:00Z',
                    downloadUrl: null},
            ],
        });

        const latest = await getLatestVersionsBySlug();

        expect(latest.get('fiefs')).toEqual({
            tag: 'v1.2.0',
            downloadUrl: 'https://github.com/Dans-Plugins/Fiefs/releases/download/v1.2.0/Fiefs-1.2.0.jar',
            downloadCount: 0,
        });
        // A release with no jar still labels the card; it just offers no file.
        expect(latest.get('medieval-factions')).toEqual({tag: 'v5.3.0', downloadUrl: null, downloadCount: 0});
    });

    it('routes the card\'s download through the API\'s counting link, at the public origin', async () => {
        vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.dansplugins.com');
        vi.stubEnv('DPC_API_INTERNAL_URL', 'http://dpc-api:8080');
        stubFetch({
            ok: true, json: async () => [
                {slug: 'fiefs', tag: 'v1.2.0', prerelease: false, publishedAt: '2026-01-01T00:00:00Z',
                    downloadUrl: 'https://github.com/Dans-Plugins/Fiefs/releases/download/v1.2.0/Fiefs-1.2.0.jar',
                    downloadPath: '/api/v1/plugins/fiefs/versions/v1.2.0/assets/Fiefs-1.2.0.jar/download',
                    siteDownloadCount: 3, totalSiteDownloadCount: 41},
            ],
        });

        // The link is what a visitor's browser follows, so it is the public
        // origin even though this runs on the server, where the fetch itself
        // goes to the internal one; the figure on the card is the total.
        expect((await getLatestVersionsBySlug()).get('fiefs')).toEqual({
            tag: 'v1.2.0',
            downloadUrl: 'https://api.dansplugins.com/api/v1/plugins/fiefs/versions/v1.2.0/assets/Fiefs-1.2.0.jar/download',
            downloadCount: 41,
        });
        vi.unstubAllEnvs();
    });

    it('treats a missing downloadUrl as no file rather than as a broken link', async () => {
        // The shape an API predating the field returns: the label must survive
        // a deploy in which the site moves before the API does.
        stubFetch({
            ok: true, json: async () => [
                {slug: 'fiefs', tag: 'v1.2.0', prerelease: false, publishedAt: '2026-01-01T00:00:00Z'},
            ],
        });

        expect((await getLatestVersionsBySlug()).get('fiefs')).toEqual({tag: 'v1.2.0', downloadUrl: null, downloadCount: 0});
    });

    it('requests the whole catalogue in one call', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => []} as Response);
        vi.stubGlobal('fetch', fetchMock);

        await getLatestVersionsBySlug();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/plugins/versions/latest');
    });

    it('has no entry for a plugin the API did not name', async () => {
        // A plugin with nothing mirrored is absent from the answer, not present
        // with a null tag — the home page renders that as no chip.
        stubFetch({ok: true, json: async () => []});
        expect((await getLatestVersionsBySlug()).has('fiefs')).toBe(false);
    });

    it('is empty on a non-ok response', async () => {
        stubFetch({ok: false, status: 500});
        expect((await getLatestVersionsBySlug()).size).toBe(0);
    });

    it('is empty when the API cannot be reached', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unreachable')));
        expect((await getLatestVersionsBySlug()).size).toBe(0);
    });

    it('is empty when the body is not an array', async () => {
        stubFetch({ok: true, json: async () => ({error: 'nope'})});
        expect((await getLatestVersionsBySlug()).size).toBe(0);
    });

    it('logs a failure rather than blanking every chip silently', async () => {
        // Without this line in the server log, a misconfigured NEXT_PUBLIC_API_URL
        // is indistinguishable from a catalogue that has mirrored no releases.
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unreachable')));

        await getLatestVersionsBySlug();

        expect(console.error).toHaveBeenCalled();
    });

    it('is empty when the body is not JSON at all', async () => {
        stubFetch({
            ok: true, json: async () => {
                throw new SyntaxError('Unexpected token < in JSON');
            },
        });
        expect((await getLatestVersionsBySlug()).size).toBe(0);
    });

    it('skips an entry missing a slug or a tag rather than mapping undefined', async () => {
        stubFetch({
            ok: true, json: async () => [
                {slug: 'fiefs', tag: 'v1.2.0'},
                {slug: 'currencies'},
                {tag: 'v9.9.9'},
                null,
            ],
        });

        const latest = await getLatestVersionsBySlug();

        expect(latest.size).toBe(1);
        expect(latest.get('fiefs')?.tag).toBe('v1.2.0');
    });
});

describe('totalDownloads', () => {
    it('sums the per-release counts', () => {
        expect(totalDownloads([
            version({tag: 'v1.1.0', downloadCount: 30}),
            version({tag: 'v1.0.0', downloadCount: 12}),
        ])).toBe(42);
    });

    it('is zero for a plugin with no mirrored releases', () => {
        expect(totalDownloads([])).toBe(0);
    });

    it('ignores a missing count rather than producing NaN', () => {
        expect(totalDownloads([version({downloadCount: undefined as unknown as number})])).toBe(0);
    });
});

describe('latestStableTag', () => {
    it('is the newest release when nothing is a pre-release', () => {
        expect(latestStableTag([
            version({tag: 'v1.1.0'}),
            version({tag: 'v1.0.0'}),
        ])).toBe('v1.1.0');
    });

    it('skips pre-releases, as GitHub\'s own "latest" does', () => {
        // The chip meant "latest stable" before the mirror existed, because it
        // read GitHub's /releases/latest; mirroring must not quietly change it
        // into "newest thing published".
        expect(latestStableTag([
            version({tag: 'v2.0.0-rc1', prerelease: true}),
            version({tag: 'v1.9.0'}),
        ])).toBe('v1.9.0');
    });

    it('falls back to the newest pre-release when there is no stable one', () => {
        expect(latestStableTag([
            version({tag: 'v0.2.0-beta', prerelease: true}),
            version({tag: 'v0.1.0-beta', prerelease: true}),
        ])).toBe('v0.2.0-beta');
    });

    it('is null for a plugin with no mirrored releases', () => {
        expect(latestStableTag([])).toBeNull();
    });
});

describe('siteDownloadUrl', () => {
    afterEach(() => vi.unstubAllEnvs());

    const asset = {
        downloadUrl: 'https://github.com/Dans-Plugins/Fiefs/releases/download/v1.2.0/Fiefs-1.2.0.jar',
        downloadPath: '/api/v1/plugins/fiefs/versions/v1.2.0/assets/Fiefs-1.2.0.jar/download',
    };

    it('prefixes the API\'s counting path with the public origin', () => {
        vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.dansplugins.com');
        expect(siteDownloadUrl(asset))
            .toBe('https://api.dansplugins.com/api/v1/plugins/fiefs/versions/v1.2.0/assets/Fiefs-1.2.0.jar/download');
    });

    it('falls back to the file on GitHub when the API served no counting path', () => {
        // An API older than the counter: the button still works, it just is not counted.
        expect(siteDownloadUrl({downloadUrl: asset.downloadUrl})).toBe(asset.downloadUrl);
        expect(siteDownloadUrl({downloadUrl: asset.downloadUrl, downloadPath: null})).toBe(asset.downloadUrl);
        expect(siteDownloadUrl({downloadUrl: asset.downloadUrl, downloadPath: ''})).toBe(asset.downloadUrl);
    });
});

describe('getPluginDownloads', () => {
    it('returns the total and latest pair on a 200 response', async () => {
        stubFetch({ok: true, json: async () => ({total: 41, latestTag: 'v1.2.0', latest: 3})});
        expect(await getPluginDownloads('fiefs')).toEqual({total: 41, latestTag: 'v1.2.0', latest: 3});
    });

    it('requests the downloads endpoint for the given slug', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => ({total: 0, latestTag: null, latest: 0})} as Response);
        vi.stubGlobal('fetch', fetchMock);

        await getPluginDownloads('medieval-factions');

        expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/plugins/medieval-factions/downloads');
    });

    it('keeps a null latestTag for a plugin with nothing mirrored', async () => {
        stubFetch({ok: true, json: async () => ({total: 0, latestTag: null, latest: 0})});
        expect(await getPluginDownloads('fiefs')).toEqual({total: 0, latestTag: null, latest: 0});
    });

    it('is null on a non-ok response, so the page omits the figures rather than showing zeros', async () => {
        stubFetch({ok: false, status: 503, statusText: 'Service Unavailable'});
        expect(await getPluginDownloads('fiefs')).toBeNull();
    });

    it('is null when the API cannot be reached', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
        expect(await getPluginDownloads('fiefs')).toBeNull();
    });

    it('is null when the body is not the documented shape', async () => {
        stubFetch({ok: true, json: async () => ({message: 'nope'})});
        expect(await getPluginDownloads('fiefs')).toBeNull();
    });
});

describe('downloadsLabel', () => {
    it('agrees in number and groups thousands', () => {
        expect(downloadsLabel(0)).toBe('0 downloads');
        expect(downloadsLabel(1)).toBe('1 download');
        expect(downloadsLabel(2)).toBe('2 downloads');
        expect(downloadsLabel(1204)).toBe('1,204 downloads');
    });
});
