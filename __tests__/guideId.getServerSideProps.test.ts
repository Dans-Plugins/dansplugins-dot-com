import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {GetServerSidePropsContext} from 'next';
import {clearCatalogueCache} from '../services/pluginCatalogueService';
import {RETRY_AFTER_SECONDS} from '../utils/serviceUnavailable';
import {fakeResponse} from './fixtures/fakeResponse';
import {catalogueResponse} from './fixtures/catalogue';

import {getServerSideProps} from '../pages/guides/[id]';

interface GuidePropsShape {
    props: {
        id: string;
        title: string;
        githubLink: string;
        html: string | null;
    };
}

interface NotFoundShape {
    notFound: true;
}

// The function reads context.params, and context.res only to answer 503 when
// the catalogue is unreadable (#612; those tests pass a fakeResponse), so a
// minimal object covers every other branch without a full context.
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

    // #612: dpc-api never reached, so whether the guide exists is unknown.
    it.each([
        ['a network error', () => Promise.reject(new Error('network unreachable'))],
        ['a timeout', () => Promise.reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))],
        ['a 5xx', () => Promise.resolve({ok: false, status: 503, statusText: 'Service Unavailable'} as Response)],
        ['an empty catalogue', () => Promise.resolve({ok: true, json: async () => []} as unknown as Response)],
    ])('answers 503 with Retry-After and noindex when the catalogue is unreadable, after %s', async (_label, answer) => {
        vi.stubGlobal('fetch', vi.fn(answer));
        const res = fakeResponse();

        const result = await getServerSideProps({params: {id: KNOWN_ID}, res} as unknown as GetServerSidePropsContext);

        expect(result).toEqual({props: {unavailable: true}});
        expect(res.statusCode).toBe(503);
        expect(res.headers['retry-after']).toBe(String(RETRY_AFTER_SECONDS));
        expect(res.headers['x-robots-tag']).toBe('noindex');
    });

    it('still answers 404, untouched status, for an id the readable catalogue lacks', async () => {
        const res = fakeResponse();

        const result = await getServerSideProps({params: {id: 'not-a-real-plugin'}, res} as unknown as GetServerSidePropsContext);

        expect(result).toEqual({notFound: true});
        expect(res.statusCode).toBe(200);
    });

    it('returns notFound when params.id is missing', async () => {
        const result = await getServerSideProps(contextWithId()) as NotFoundShape;
        expect(result).toEqual({notFound: true});
    });

    it('returns the fetched markdown, rendered to HTML, when the raw USER_GUIDE.md fetch succeeds', async () => {
        vi.stubGlobal('fetch', guideFetch(() => Promise.resolve({ok: true, text: () => Promise.resolve('# Hello')} as Response)));

        const result = await getServerSideProps(contextWithId(KNOWN_ID)) as GuidePropsShape;

        expect(result.props).toEqual({
            id: KNOWN_ID,
            title: 'Activity Tracker',
            githubLink: KNOWN_GITHUB_LINK,
            html: '<h2 id="hello">Hello</h2>',
        });
    });

    it('falls back to null html when the fetch response is not ok', async () => {
        vi.stubGlobal('fetch', guideFetch(() => Promise.resolve({ok: false, text: () => Promise.resolve('')} as Response)));

        const result = await getServerSideProps(contextWithId(KNOWN_ID)) as GuidePropsShape;

        expect(result.props.html).toBeNull();
        expect(result.props.id).toBe(KNOWN_ID);
    });

    it('falls back to null html when the fetch throws (network failure)', async () => {
        vi.stubGlobal('fetch', guideFetch(() => Promise.reject(new Error('network unreachable'))));

        const result = await getServerSideProps(contextWithId(KNOWN_ID)) as GuidePropsShape;

        expect(result.props.html).toBeNull();
    });
});
