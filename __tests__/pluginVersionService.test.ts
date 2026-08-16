import {afterEach, describe, expect, it, vi} from 'vitest';
import {
    getLatestVersionsBySlug,
    getPluginVersions,
    latestStableTag,
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
    assets: [],
    ...overrides,
});

const stubFetch = (response: Partial<Response>) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response as Response));
};

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
    it('keys the tags by catalogue slug', async () => {
        stubFetch({
            ok: true, json: async () => [
                {slug: 'fiefs', tag: 'v1.2.0', prerelease: false, publishedAt: '2026-01-01T00:00:00Z'},
                {slug: 'medieval-factions', tag: 'v5.3.0', prerelease: false, publishedAt: '2026-02-01T00:00:00Z'},
            ],
        });

        const latest = await getLatestVersionsBySlug();

        expect(latest.get('fiefs')).toBe('v1.2.0');
        expect(latest.get('medieval-factions')).toBe('v5.3.0');
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
        expect(latest.get('fiefs')).toBe('v1.2.0');
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
