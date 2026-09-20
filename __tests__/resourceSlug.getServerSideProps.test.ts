import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {GetServerSidePropsContext} from 'next';

import {getServerSideProps} from '../pages/resources/[slug]';
import {clearServerCountCache} from '../utils/bstats';
import {clearTestedVersionsCache} from '../utils/spigot';
import type {PluginDownloads, PluginVersion} from '../services/pluginVersionService';

interface ResourcePropsShape {
    props: {
        slug: string;
        title: string;
        description: string;
        githubLink: string;
        spigotmcLink: string | null;
        icon: string | null;
        serverCount: number | null;
        latestVersion: string | null;
        versions: PluginVersion[];
        downloads: PluginDownloads | null;
        testedVersions: string[] | null;
        firstReleasedAt: string | null;
        lastUpdatedAt: string | null;
    };
}

interface NotFoundShape {
    notFound: true;
}

// The function only reads context.params, so a minimal object covers every
// branch without constructing a full GetServerSidePropsContext (req/res/etc).
const contextWithSlug = (slug?: string): GetServerSidePropsContext =>
    ({params: slug === undefined ? {} : {slug}} as GetServerSidePropsContext);

// Real entries from pages/data/plugins.json, so the lookup exercises the actual
// catalogue rather than a fixture that could drift from it. MEDIEVAL_COOKERY is
// the one plugin with neither a SpigotMC page nor a bStats project — the
// empty-string case the page has to normalise.
const KNOWN_SLUG = 'activity-tracker';
const SLUG_WITHOUT_OPTIONAL_LINKS = 'medieval-cookery';

// A release as dpc-api's mirror serves it, trimmed to the fields the page reads.
const mirroredVersion = (spec: string | {tag: string; publishedAt: string}): PluginVersion => ({
    tag: typeof spec === 'string' ? spec : spec.tag,
    name: `Activity Tracker ${typeof spec === 'string' ? spec : spec.tag}`,
    changelog: '### Fixed\n- Something',
    htmlUrl: `https://github.com/Dans-Plugins/Activity-Tracker/releases/tag/${typeof spec === 'string' ? spec : spec.tag}`,
    prerelease: false,
    publishedAt: typeof spec === 'string' ? '2026-01-01T00:00:00Z' : spec.publishedAt,
    downloadCount: 40,
    siteDownloadCount: 0,
    assets: [],
});

// Route the six upstreams the page calls by URL, so a test can fail one
// without affecting the others.
const stubUpstreams = ({servers, tag, versions, downloads, tested, firstReleasedAt}: {
    servers?: number;
    tag?: string;
    versions?: PluginVersion[];
    downloads?: PluginDownloads;
    tested?: string[];
    // The catalogue row: absent fails that request, null is "not yet recorded".
    firstReleasedAt?: string | null;
}) => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (/\/api\/v1\/plugins\/[^/]+$/.test(url)) {
            return firstReleasedAt === undefined
                ? {ok: false, status: 503, statusText: 'Service Unavailable'} as Response
                : {ok: true, json: async () => ({slug: url.split('/').pop(), firstReleasedAt})} as unknown as Response;
        }
        if (url.includes('api.spiget.org')) {
            return tested === undefined
                ? {ok: false, status: 503, statusText: 'Service Unavailable'} as Response
                : {ok: true, json: async () => ({testedVersions: tested})} as unknown as Response;
        }
        if (url.includes('bstats.org')) {
            return servers === undefined
                ? {ok: false, status: 503, statusText: 'Service Unavailable'} as Response
                : {ok: true, json: async () => [[0, servers]]} as unknown as Response;
        }
        if (url.includes('/downloads')) {
            return downloads === undefined
                ? {ok: false, status: 503, statusText: 'Service Unavailable'} as Response
                : {ok: true, json: async () => downloads} as unknown as Response;
        }
        if (url.includes('/versions')) {
            return versions === undefined
                ? {ok: false, status: 503, statusText: 'Service Unavailable'} as Response
                : {ok: true, json: async () => versions} as unknown as Response;
        }
        if (url.includes('api.github.com')) {
            return tag === undefined
                ? {ok: false, status: 404, statusText: 'Not Found'} as Response
                : {ok: true, json: async () => ({tag_name: tag})} as unknown as Response;
        }
        throw new Error(`unexpected fetch to ${url}`);
    }));
};

beforeEach(() => {
    // Server counts are cached across renders (utils/bstats.ts); each test
    // must start from an empty cache or a count leaks from the previous one.
    clearServerCountCache();
    clearTestedVersionsCache();
    // The default case is the one that matters most: an unmirrored plugin, where
    // the latest tag still comes from the live GitHub call.
    stubUpstreams({servers: 1234, tag: 'v1.2.3', versions: [], tested: ['1.18', '1.19', '1.20'], firstReleasedAt: null});
});

describe('resource page getServerSideProps', () => {
    it('returns notFound for a slug absent from the catalogue', async () => {
        const result = await getServerSideProps(contextWithSlug('not-a-real-plugin')) as NotFoundShape;
        expect(result).toEqual({notFound: true});
    });

    it('returns notFound when params.slug is missing', async () => {
        const result = await getServerSideProps(contextWithSlug()) as NotFoundShape;
        expect(result).toEqual({notFound: true});
    });

    it('serves the catalogue entry alongside the live server count and latest release', async () => {
        const result = await getServerSideProps(contextWithSlug(KNOWN_SLUG)) as ResourcePropsShape;

        expect(result.props).toEqual({
            slug: KNOWN_SLUG,
            title: 'Activity Tracker',
            description: 'Tracks the activity of players.',
            githubLink: 'https://github.com/Dans-Plugins/Activity-Tracker',
            spigotmcLink: 'https://www.spigotmc.org/resources/activity-tracker.96724/',
            icon: '/icons/at.png',
            serverCount: 1234,
            latestVersion: 'v1.2.3',
            testedVersions: ['1.18', '1.19', '1.20'],
            versions: [],
            downloads: null,
            firstReleasedAt: null,
            lastUpdatedAt: null
        });
    });

    it('states the first release as dpc-api recorded it, and the last update as the newest mirrored release', async () => {
        stubUpstreams({
            servers: 1234, tag: 'v1.2.3', firstReleasedAt: '2021-06-15T12:00:00Z',
            versions: [
                mirroredVersion({tag: 'v1.2.3', publishedAt: '2026-03-01T00:00:00Z'}),
                mirroredVersion({tag: 'v1.2.2', publishedAt: '2026-02-01T00:00:00Z'})
            ]
        });

        const result = await getServerSideProps(contextWithSlug(KNOWN_SLUG)) as ResourcePropsShape;

        expect(result.props.firstReleasedAt).toBe('2021-06-15T12:00:00Z');
        expect(result.props.lastUpdatedAt).toBe('2026-03-01T00:00:00Z');
    });

    it('never takes the mirror\'s oldest row for the first release', async () => {
        // The mirror keeps only the newest releases, so its oldest row is not
        // the first release; with nothing recorded the date is withheld.
        stubUpstreams({
            servers: 1234, tag: 'v1.2.3', firstReleasedAt: null,
            versions: [mirroredVersion({tag: 'v1.2.3', publishedAt: '2026-03-01T00:00:00Z'})]
        });

        const result = await getServerSideProps(contextWithSlug(KNOWN_SLUG)) as ResourcePropsShape;

        expect(result.props.firstReleasedAt).toBeNull();
        expect(result.props.lastUpdatedAt).toBe('2026-03-01T00:00:00Z');
    });

    it('still serves the page, without dates, when the catalogue row cannot be read', async () => {
        stubUpstreams({servers: 1234, tag: 'v1.2.3', versions: []});

        const result = await getServerSideProps(contextWithSlug(KNOWN_SLUG)) as ResourcePropsShape;

        expect(result.props.firstReleasedAt).toBeNull();
        expect(result.props.lastUpdatedAt).toBeNull();
        expect(result.props.serverCount).toBe(1234);
    });

    it('asks Spiget for the resource id in the catalogue\'s SpigotMC link, and nothing more', async () => {
        await getServerSideProps(contextWithSlug(KNOWN_SLUG));

        const spigetCalls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
            .map(([url]) => url as string)
            .filter((url) => url.includes('api.spiget.org'));
        expect(spigetCalls).toEqual(['https://api.spiget.org/v2/resources/96724?fields=testedVersions']);
    });

    it('serves null tested versions, and makes no Spiget call, for a plugin with no SpigotMC page', async () => {
        const result = await getServerSideProps(contextWithSlug(SLUG_WITHOUT_OPTIONAL_LINKS)) as ResourcePropsShape;

        expect(result.props.testedVersions).toBeNull();
        const spigetCalls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
            .map(([url]) => url as string)
            .filter((url) => url.includes('api.spiget.org'));
        expect(spigetCalls).toEqual([]);
    });

    it('still serves the page, without tested versions, when Spiget is unavailable', async () => {
        stubUpstreams({servers: 1234, tag: 'v1.2.3', versions: []});

        const result = await getServerSideProps(contextWithSlug(KNOWN_SLUG)) as ResourcePropsShape;

        expect(result.props.testedVersions).toBeNull();
        expect(result.props.serverCount).toBe(1234);
    });

    it('serves the site\'s own download figures when dpc-api has them', async () => {
        stubUpstreams({servers: 1234, versions: [mirroredVersion('v2.0.0')],
            downloads: {total: 41, latestTag: 'v2.0.0', latest: 3}});

        const result = await getServerSideProps(contextWithSlug(KNOWN_SLUG)) as ResourcePropsShape;

        expect(result.props.downloads).toEqual({total: 41, latestTag: 'v2.0.0', latest: 3});
    });

    it('serves null download figures, not zeros, when that endpoint fails', async () => {
        stubUpstreams({servers: 1234, versions: [mirroredVersion('v2.0.0')]});

        const result = await getServerSideProps(contextWithSlug(KNOWN_SLUG)) as ResourcePropsShape;

        // The version history is still there; only the figures are withheld.
        expect(result.props.versions).toHaveLength(1);
        expect(result.props.downloads).toBeNull();
    });

    it('serves the mirrored release history when dpc-api has one', async () => {
        stubUpstreams({servers: 1234, versions: [mirroredVersion('v2.0.0'), mirroredVersion('v1.9.0')]});

        const result = await getServerSideProps(contextWithSlug(KNOWN_SLUG)) as ResourcePropsShape;

        expect(result.props.versions).toHaveLength(2);
        // The mirror is newest-first and already names the latest tag, which is
        // why the chip reads from it here.
        expect(result.props.latestVersion).toBe('v2.0.0');
    });

    it('does not call GitHub for a tag the mirror already knows', async () => {
        const fetchMock = vi.fn(async (url: string) => {
            if (url.includes('/versions')) {
                return {ok: true, json: async () => [mirroredVersion('v2.0.0')]} as unknown as Response;
            }
            return {ok: true, json: async () => [[0, 1]]} as unknown as Response;
        });
        vi.stubGlobal('fetch', fetchMock);

        await getServerSideProps(contextWithSlug(KNOWN_SLUG));

        // The whole point of the mirror is that a page render doesn't spend a
        // call on GitHub's rate limit for something dpc-api already holds.
        expect(fetchMock.mock.calls.some(([url]) => (url as string).includes('api.github.com'))).toBe(false);
    });

    it('falls back to the live GitHub tag when the mirror is unreachable', async () => {
        stubUpstreams({servers: 1234, tag: 'v1.2.3'});

        const result = await getServerSideProps(contextWithSlug(KNOWN_SLUG)) as ResourcePropsShape;

        expect(result.props.versions).toEqual([]);
        expect(result.props.latestVersion).toBe('v1.2.3');
    });

    it('normalises the catalogue\'s empty strings to null', async () => {
        const result = await getServerSideProps(contextWithSlug(SLUG_WITHOUT_OPTIONAL_LINKS)) as ResourcePropsShape;

        expect(result.props.spigotmcLink).toBeNull();
        expect(result.props.icon).toBeNull();
        // No bStats project means no request to make, so no count either.
        expect(result.props.serverCount).toBeNull();
    });

    it('still serves the page when bStats is unavailable', async () => {
        stubUpstreams({tag: 'v1.2.3', versions: []});

        const result = await getServerSideProps(contextWithSlug(KNOWN_SLUG)) as ResourcePropsShape;

        expect(result.props.serverCount).toBeNull();
        expect(result.props.latestVersion).toBe('v1.2.3');
    });

    it('still serves the page when the repository has no releases', async () => {
        stubUpstreams({servers: 1234, versions: []});

        const result = await getServerSideProps(contextWithSlug(KNOWN_SLUG)) as ResourcePropsShape;

        expect(result.props.latestVersion).toBeNull();
        expect(result.props.serverCount).toBe(1234);
    });

    it('still serves the page when every upstream throws', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unreachable')));

        const result = await getServerSideProps(contextWithSlug(KNOWN_SLUG)) as ResourcePropsShape;

        expect(result.props.title).toBe('Activity Tracker');
        expect(result.props.serverCount).toBeNull();
        expect(result.props.latestVersion).toBeNull();
        expect(result.props.versions).toEqual([]);
    });

    it('never returns undefined, which Next.js cannot serialise into page props', async () => {
        const result = await getServerSideProps(contextWithSlug(SLUG_WITHOUT_OPTIONAL_LINKS)) as ResourcePropsShape;

        expect(Object.values(result.props).some((value) => value === undefined)).toBe(false);
    });
});
