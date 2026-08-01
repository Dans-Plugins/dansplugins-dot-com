import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {GetServerSidePropsContext} from 'next';

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

// A real id/githubLink pair from pages/data/plugins.json, so the lookup
// exercises the actual catalogue rather than a fixture that could drift from it.
const KNOWN_ID = 'activity-tracker';
const KNOWN_GITHUB_LINK = 'https://github.com/Dans-Plugins/Activity-Tracker';

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
});

describe('guide page getServerSideProps', () => {
    it('returns notFound for an id absent from plugins.json', async () => {
        const result = await getServerSideProps(contextWithId('not-a-real-plugin')) as NotFoundShape;
        expect(result).toEqual({notFound: true});
    });

    it('returns notFound when params.id is missing', async () => {
        const result = await getServerSideProps(contextWithId()) as NotFoundShape;
        expect(result).toEqual({notFound: true});
    });

    it('returns the fetched markdown when the raw USER_GUIDE.md fetch succeeds', async () => {
        vi.mocked(fetch).mockResolvedValue({ok: true, text: () => Promise.resolve('# Hello')} as Response);

        const result = await getServerSideProps(contextWithId(KNOWN_ID)) as GuidePropsShape;

        expect(result.props).toEqual({
            id: KNOWN_ID,
            title: 'Activity Tracker',
            githubLink: KNOWN_GITHUB_LINK,
            markdown: '# Hello',
        });
    });

    it('falls back to null markdown when the fetch response is not ok', async () => {
        vi.mocked(fetch).mockResolvedValue({ok: false, text: () => Promise.resolve('')} as Response);

        const result = await getServerSideProps(contextWithId(KNOWN_ID)) as GuidePropsShape;

        expect(result.props.markdown).toBeNull();
        expect(result.props.id).toBe(KNOWN_ID);
    });

    it('falls back to null markdown when the fetch throws (network failure)', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('network unreachable'));

        const result = await getServerSideProps(contextWithId(KNOWN_ID)) as GuidePropsShape;

        expect(result.props.markdown).toBeNull();
    });
});
