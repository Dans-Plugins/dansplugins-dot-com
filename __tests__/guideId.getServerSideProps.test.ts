import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {GetServerSidePropsContext} from 'next';
import {clearCatalogueCache} from '../services/pluginCatalogueService';
import {catalogueResponse} from './fixtures/catalogue';

import {getServerSideProps} from '../pages/guides/[id]';

interface GuidePropsShape {
    props: {
        id: string;
        title: string;
        githubLink: string;
        markdown: string | null;
    };
}

interface NotFoundShape {
    notFound: true;
}

// The function only reads context.params, so a minimal object covers every
// branch without constructing a full GetServerSidePropsContext (req/res/etc).
const contextWithId = (id?: string): GetServerSidePropsContext =>
    ({params: id === undefined ? {} : {id}} as GetServerSidePropsContext);

// An id/githubLink pair from the catalogue fixture the API stub serves.
const KNOWN_ID = 'activity-tracker';
const KNOWN_GITHUB_LINK = 'https://github.com/Dans-Plugins/Activity-Tracker';

// The catalogue is read from dpc-api and cached per process (see
// services/pluginCatalogueService.ts); each test starts from an empty cache and
// a fetch that answers the catalogue and leaves the guide fetch to the test.
const guideFetch = (answer: (url: string) => Promise<Response>) =>
    vi.fn((url: string) => url.includes('/api/v1/plugins') ? Promise.resolve(catalogueResponse()) : answer(url));

beforeEach(() => {
    clearCatalogueCache();
    vi.stubGlobal('fetch', guideFetch(() => Promise.reject(new Error('guide fetch not stubbed'))));
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('guide page getServerSideProps', () => {
    it('returns notFound for an id absent from the catalogue', async () => {
        const result = await getServerSideProps(contextWithId('not-a-real-plugin')) as NotFoundShape;
        expect(result).toEqual({notFound: true});
    });

    it('returns notFound when params.id is missing', async () => {
        const result = await getServerSideProps(contextWithId()) as NotFoundShape;
        expect(result).toEqual({notFound: true});
    });

    it('returns the fetched markdown when the raw USER_GUIDE.md fetch succeeds', async () => {
        vi.stubGlobal('fetch', guideFetch(() => Promise.resolve({ok: true, text: () => Promise.resolve('# Hello')} as Response)));

        const result = await getServerSideProps(contextWithId(KNOWN_ID)) as GuidePropsShape;

        expect(result.props).toEqual({
            id: KNOWN_ID,
            title: 'Activity Tracker',
            githubLink: KNOWN_GITHUB_LINK,
            markdown: '# Hello',
        });
    });

    it('falls back to null markdown when the fetch response is not ok', async () => {
        vi.stubGlobal('fetch', guideFetch(() => Promise.resolve({ok: false, text: () => Promise.resolve('')} as Response)));

        const result = await getServerSideProps(contextWithId(KNOWN_ID)) as GuidePropsShape;

        expect(result.props.markdown).toBeNull();
        expect(result.props.id).toBe(KNOWN_ID);
    });

    it('falls back to null markdown when the fetch throws (network failure)', async () => {
        vi.stubGlobal('fetch', guideFetch(() => Promise.reject(new Error('network unreachable'))));

        const result = await getServerSideProps(contextWithId(KNOWN_ID)) as GuidePropsShape;

        expect(result.props.markdown).toBeNull();
    });
});
