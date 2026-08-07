import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {NewsPost} from '../utils/newsStorage';

// getNewsPosts reads (and, when absent, seeds) data/news.json on disk. Mock it so
// this test covers only the page's wiring and never touches the shared fixture.
vi.mock('../utils/newsStorage', () => ({
    getNewsPosts: vi.fn()
}));

import {getNewsPosts} from '../utils/newsStorage';
import {getServerSideProps} from '../pages/news';

interface NewsPropsShape {
    props: {
        posts: NewsPost[];
    };
}

const post = (id: string, date: string): NewsPost => ({
    id,
    title: `Post ${id}`,
    date,
    body: 'Body text.',
    source: 'direct',
    sourceUrl: null,
    author: null
});

beforeEach(() => {
    vi.mocked(getNewsPosts).mockReset();
});

describe('news page getServerSideProps', () => {
    it('passes the stored posts through as props', async () => {
        const posts = [post('b', '2026-02-01'), post('a', '2026-01-01')];
        vi.mocked(getNewsPosts).mockReturnValue(posts);

        const result = await getServerSideProps() as NewsPropsShape;

        expect(result).toEqual({props: {posts}});
    });

    // Ordering is getNewsPosts' job (newest first); the page must not re-sort or
    // filter, so the prop order has to match the order it was handed.
    it('preserves the order getNewsPosts returned', async () => {
        vi.mocked(getNewsPosts).mockReturnValue([post('b', '2026-02-01'), post('a', '2026-01-01')]);

        const result = await getServerSideProps() as NewsPropsShape;

        expect(result.props.posts.map((p) => p.id)).toEqual(['b', 'a']);
    });

    it('returns an empty list when there are no posts (the page renders its empty state)', async () => {
        vi.mocked(getNewsPosts).mockReturnValue([]);

        const result = await getServerSideProps() as NewsPropsShape;

        expect(result.props.posts).toEqual([]);
    });

    it('reads the posts once per request rather than at import time', async () => {
        vi.mocked(getNewsPosts).mockReturnValue([]);

        await getServerSideProps();
        await getServerSideProps();

        expect(vi.mocked(getNewsPosts)).toHaveBeenCalledTimes(2);
    });
});
